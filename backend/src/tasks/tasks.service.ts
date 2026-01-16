import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull } from 'typeorm';
import { Task, TaskStatus, RepeatType } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const taskData: any = {
      ...createTaskDto,
      creatorId: userId,
    };

    // 如果有重复规则，计算 nextRepeatDate
    if (createTaskDto.repeatType) {
      taskData.nextRepeatDate = this.calculateNextRepeatDate(
        createTaskDto.repeatType,
        createTaskDto.plannedFinishTime || new Date(),
        createTaskDto.repeatInterval || 1,
      );
      // 如果 originalTaskId 未设置，使用当前任务作为原始任务
      if (!taskData.originalTaskId) {
        // 这个会在保存后设置
      }
    }

    const task = this.tasksRepository.create(taskData);
    const savedTask = await this.tasksRepository.save(task) as unknown as Task;

    // 如果设置了重复规则，将 originalTaskId 设置为自己的 ID
    if (savedTask.repeatType && !savedTask.originalTaskId) {
      savedTask.originalTaskId = savedTask.id;
      await this.tasksRepository.save(savedTask);
    }

    return this.findOne(savedTask.id, userId);
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

  async findAll(queryDto: QueryTaskDto, userId: string): Promise<Task[]> {
    const queryBuilder = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.watchers', 'watchers')
      .leftJoinAndSelect('task.team', 'team')
      .leftJoinAndSelect('task.subTasks', 'subTasks')
      .leftJoinAndSelect('task.parentTask', 'parentTask')
      .where(
        '(task.creatorId = :userId OR task.assigneeId = :userId OR EXISTS (SELECT 1 FROM task_watchers tw WHERE tw."taskId" = task.id AND tw."userId" = :userId))',
        { userId },
      );

    // 筛选：时段
    if (queryDto.startTime) {
      queryBuilder.andWhere('task.createdAt >= :startTime', {
        startTime: queryDto.startTime,
      });
    }
    if (queryDto.endTime) {
      queryBuilder.andWhere('task.createdAt <= :endTime', {
        endTime: queryDto.endTime,
      });
    }

    // 筛选：创作人
    if (queryDto.creatorId) {
      queryBuilder.andWhere('task.creatorId = :creatorId', {
        creatorId: queryDto.creatorId,
      });
    }

    // 筛选：任务人（执行人）
    if (queryDto.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', {
        assigneeId: queryDto.assigneeId,
      });
    }

    // 排序
    const orderBy = queryDto.orderBy || 'createdAt';
    const orderDirection = queryDto.orderDirection || 'DESC';
    queryBuilder.orderBy(`task.${orderBy}`, orderDirection);

    return queryBuilder.getMany();
  }

  async findOne(id: string, userId: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: [
        'creator',
        'assignee',
        'watchers',
        'team',
        'subTasks',
        'parentTask',
        'comments',
        'comments.user',
      ],
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    // 检查权限：用户可以看到自己的任务、被指派的任务、关注的任务
    const hasAccess =
      task.creatorId === userId ||
      task.assigneeId === userId ||
      task.watchers?.some((w) => w.id === userId);

    if (!hasAccess) {
      throw new ForbiddenException('无权访问此任务');
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(id, userId);

    // 检查权限：只有创建者或执行人可以修改
    if (task.creatorId !== userId && task.assigneeId !== userId) {
      throw new ForbiddenException('无权修改此任务');
    }

    Object.assign(task, updateTaskDto);
    const updatedTask = await this.tasksRepository.save(task);

    // 如果是子任务完成，检查是否所有子任务都完成，如果是则完成主任务
    if (updateTaskDto.status === TaskStatus.DONE && task.parentTaskId) {
      await this.checkAndCompleteParentTask(task.parentTaskId);
    }

    return this.findOne(updatedTask.id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findOne(id, userId);

    // 只有创建者可以删除
    if (task.creatorId !== userId) {
      throw new ForbiddenException('无权删除此任务');
    }

    await this.tasksRepository.remove(task);
  }

  async assignTask(taskId: string, assigneeId: string, userId: string): Promise<Task> {
    const task = await this.findOne(taskId, userId);
    if (task.creatorId !== userId) {
      throw new ForbiddenException('无权指派此任务');
    }
    task.assigneeId = assigneeId;
    return this.tasksRepository.save(task).then(() => this.findOne(taskId, userId));
  }

  async addWatchers(taskId: string, watcherIds: string[]): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['watchers'],
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (!task.watchers) {
      task.watchers = [];
    }

    const existingWatcherIds = task.watchers.map((w) => w.id);
    const newWatcherIds = watcherIds.filter((id) => !existingWatcherIds.includes(id));

    if (newWatcherIds.length > 0) {
      const newWatchers = newWatcherIds.map((id) => ({ id } as any));
      task.watchers = [...task.watchers, ...newWatchers];
      await this.tasksRepository.save(task);
    }

    return this.findOne(taskId, task.creatorId); // 使用创建者ID，因为没有传入userId
  }

  async addWatcher(taskId: string, watcherId: string, userId: string): Promise<Task> {
    return this.addWatchers(taskId, [watcherId]).then(() => this.findOne(taskId, userId));
  }

  async removeWatcher(taskId: string, watcherId: string, userId: string): Promise<Task> {
    const task = await this.findOne(taskId, userId);
    if (task.watchers) {
      task.watchers = task.watchers.filter((w) => w.id !== watcherId);
      await this.tasksRepository.save(task);
    }
    return this.findOne(taskId, userId);
  }

  private async checkAndCompleteParentTask(parentTaskId: string): Promise<void> {
    const parentTask = await this.tasksRepository.findOne({
      where: { id: parentTaskId },
      relations: ['subTasks'],
    });

    if (parentTask && parentTask.subTasks) {
      const allSubTasksDone = parentTask.subTasks.every(
        (subTask) => subTask.status === TaskStatus.DONE,
      );
      if (allSubTasksDone) {
        parentTask.status = TaskStatus.DONE;
        await this.tasksRepository.save(parentTask);
      }
    }
  }
}
