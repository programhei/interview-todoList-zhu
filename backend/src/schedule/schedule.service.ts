import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, LessThan, Not, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Task, RepeatType, TaskStatus } from '../tasks/entities/task.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private notificationsService: NotificationsService,
    private tasksService: TasksService,
  ) {}

  // 每天凌晨1点检查即将到期的任务
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async checkDueTasks() {
    this.logger.log('开始检查即将到期的任务...');

    const now = new Date();
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后

    // 查找24小时内到期的未完成任务
    const dueSoonTasks = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.TODO })
      .andWhere('task.plannedFinishTime >= :now', { now })
      .andWhere('task.plannedFinishTime <= :oneDayLater', { oneDayLater })
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.watchers', 'watchers')
      .getMany();

    this.logger.log(`找到 ${dueSoonTasks.length} 个即将到期的任务`);

    for (const task of dueSoonTasks) {
      try {
        await this.notificationsService.createForTaskUsers(
          task,
          NotificationType.DUE_SOON,
          `任务"${task.title}"将在24小时内到期`,
        );
      } catch (error) {
        this.logger.error(`为任务 ${task.id} 创建通知失败: ${error.message}`);
      }
    }

    // 检查已逾期的任务
    const overdueTasks = await this.taskRepository.find({
      where: {
        status: TaskStatus.TODO,
        plannedFinishTime: LessThan(now),
      },
      relations: ['creator', 'assignee', 'watchers'],
    });

    this.logger.log(`找到 ${overdueTasks.length} 个已逾期的任务`);

    for (const task of overdueTasks) {
      try {
        await this.notificationsService.createForTaskUsers(
          task,
          NotificationType.OVERDUE,
          `任务"${task.title}"已逾期`,
        );
      } catch (error) {
        this.logger.error(`为任务 ${task.id} 创建通知失败: ${error.message}`);
      }
    }

    this.logger.log('任务到期检查完成');
  }

  // 每天凌晨2点检查并创建重复任务
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async createRepeatTasks() {
    this.logger.log('开始检查重复任务...');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 查找需要创建重复任务的任务（nextRepeatDate <= tomorrow）
    const tasksToRepeat = await this.taskRepository.find({
      where: {
        repeatType: Not(IsNull()), // 任何重复类型（非空）
        nextRepeatDate: LessThanOrEqual(tomorrow),
      },
      relations: ['creator', 'assignee', 'watchers', 'subTasks'],
    });

    this.logger.log(`找到 ${tasksToRepeat.length} 个需要创建重复的任务`);

    for (const task of tasksToRepeat) {
      try {
        // 检查是否已经超过结束日期
        if (task.repeatEndDate && task.repeatEndDate < now) {
          this.logger.log(`任务 ${task.id} 的重复已过期，跳过`);
          continue;
        }

        // 检查 nextRepeatDate 是否应该创建
        if (task.nextRepeatDate && task.nextRepeatDate > tomorrow) {
          continue;
        }

        // 计算下一个重复日期
        const nextRepeatDate = this.calculateNextRepeatDate(
          task.repeatType,
          task.nextRepeatDate || task.plannedFinishTime || now,
          task.repeatInterval || 1,
        );

        // 如果下一个重复日期超过结束日期，则不创建
        if (task.repeatEndDate && nextRepeatDate > task.repeatEndDate) {
          this.logger.log(`任务 ${task.id} 的下一个重复日期已超过结束日期，跳过`);
          continue;
        }

        // 创建重复任务
        const newTask = await this.createRepeatTask(task, nextRepeatDate);

        // 更新原任务的 nextRepeatDate
        task.nextRepeatDate = nextRepeatDate;
        await this.taskRepository.save(task);

        // 发送通知
        await this.notificationsService.createForTaskUsers(
          task,
          NotificationType.REPEAT_CREATED,
          `重复任务"${task.title}"已自动创建`,
        );

        this.logger.log(`已为任务 ${task.id} 创建重复任务 ${newTask.id}`);
      } catch (error) {
        this.logger.error(`为任务 ${task.id} 创建重复任务失败: ${error.message}`);
      }
    }

    this.logger.log('重复任务检查完成');
  }

  private calculateNextRepeatDate(
    repeatType: RepeatType,
    currentDate: Date,
    interval: number,
  ): Date {
    const nextDate = new Date(currentDate);

    switch (repeatType) {
      case RepeatType.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case RepeatType.WEEKLY:
        nextDate.setDate(nextDate.getDate() + interval * 7);
        break;
      case RepeatType.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case RepeatType.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + interval);
    }

    return nextDate;
  }

  private async createRepeatTask(originalTask: Task, nextRepeatDate: Date): Promise<Task> {
    // 计算新任务的计划完成时间
    const originalPlannedTime = originalTask.plannedFinishTime;
    const plannedFinishTime = originalPlannedTime
      ? new Date(
          nextRepeatDate.getTime() +
            (originalPlannedTime.getTime() - (originalTask.nextRepeatDate || originalTask.plannedFinishTime || new Date()).getTime()),
        )
      : nextRepeatDate;

    // 创建新任务
    const newTask = this.taskRepository.create({
      title: originalTask.title,
      description: originalTask.description,
      status: originalTask.status,
      creatorId: originalTask.creatorId,
      assigneeId: originalTask.assigneeId,
      teamId: originalTask.teamId,
      plannedFinishTime: plannedFinishTime,
      repeatType: originalTask.repeatType,
      repeatInterval: originalTask.repeatInterval,
      repeatEndDate: originalTask.repeatEndDate,
      nextRepeatDate: this.calculateNextRepeatDate(
        originalTask.repeatType,
        nextRepeatDate,
        originalTask.repeatInterval || 1,
      ),
      originalTaskId: originalTask.originalTaskId || originalTask.id,
      parentTaskId: originalTask.parentTaskId, // 如果是子任务，保持父子关系
    });

    const savedTask = await this.taskRepository.save(newTask);

    // 复制关注者
    if (originalTask.watchers && originalTask.watchers.length > 0) {
      await this.tasksService.addWatchers(savedTask.id, originalTask.watchers.map((w) => w.id));
    }

    // 如果有子任务，也创建重复子任务
    if (originalTask.subTasks && originalTask.subTasks.length > 0) {
      for (const subtask of originalTask.subTasks) {
        if (subtask.repeatType) {
          // 如果子任务也有重复规则，递归创建
          const subtaskNextDate = this.calculateNextRepeatDate(
            subtask.repeatType,
            subtask.nextRepeatDate || subtask.plannedFinishTime || nextRepeatDate,
            subtask.repeatInterval || 1,
          );
          await this.createRepeatTask(subtask, subtaskNextDate);
        } else {
          // 否则创建一次性子任务
          const newSubtask = this.taskRepository.create({
            title: subtask.title,
            description: subtask.description,
            status: subtask.status,
            creatorId: subtask.creatorId,
            assigneeId: subtask.assigneeId,
            parentTaskId: savedTask.id,
            plannedFinishTime: plannedFinishTime,
          });
          await this.taskRepository.save(newSubtask);
        }
      }
    }

    return savedTask;
  }
}
