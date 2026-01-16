import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    private tasksService: TasksService,
  ) {}

  async create(createCommentDto: CreateCommentDto, userId: string): Promise<Comment> {
    // 验证任务存在且有权限访问
    await this.tasksService.findOne(createCommentDto.taskId, userId);

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      userId,
    });
    return this.commentsRepository.save(comment);
  }

  async findByTask(taskId: string, userId: string): Promise<Comment[]> {
    // 验证任务存在且有权限访问
    await this.tasksService.findOne(taskId, userId);

    return this.commentsRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['task'],
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 只有评论创建者可以删除
    if (comment.userId !== userId) {
      throw new NotFoundException('无权删除此评论');
    }

    await this.commentsRepository.remove(comment);
  }
}
