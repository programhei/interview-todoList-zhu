import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(
    userId: string,
    taskId: string | null,
    type: NotificationType,
    message: string,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create({
      userId,
      taskId,
      type,
      message,
      read: false,
    });
    return await this.notificationRepository.save(notification);
  }

  async createForTaskUsers(
    task: Task,
    type: NotificationType,
    message: string,
  ): Promise<Notification[]> {
    const notifications: Notification[] = [];
    const userIds = new Set<string>();

    // 添加任务创建者
    if (task.creatorId) {
      userIds.add(task.creatorId);
    }

    // 添加任务执行者
    if (task.assigneeId) {
      userIds.add(task.assigneeId);
    }

    // 添加关注者
    if (task.watchers && task.watchers.length > 0) {
      task.watchers.forEach((watcher) => {
        userIds.add(watcher.id);
      });
    }

    // 为每个用户创建通知
    for (const userId of userIds) {
      const notification = await this.create(userId, task.id, type, message);
      notifications.push(notification);
    }

    return notifications;
  }

  async findAll(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.task', 'task')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (unreadOnly) {
      queryBuilder.andWhere('notification.read = :read', { read: false });
    }

    return await queryBuilder.getMany();
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('通知不存在或无权限');
    }

    notification.read = true;
    return await this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  async delete(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    });

    if (result.affected === 0) {
      throw new Error('通知不存在或无权限');
    }
  }
}
