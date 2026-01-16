import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'uuid' })
  userId: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  taskId: string | null;

  @ApiProperty({ enum: NotificationType, example: NotificationType.DUE_SOON })
  type: NotificationType;

  @ApiProperty({ example: '任务"完成项目文档"将在24小时内到期' })
  message: string;

  @ApiProperty({ example: false })
  read: boolean;

  @ApiProperty({ example: '2024-01-16T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ required: false })
  task?: {
    id: string;
    title: string;
  };
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 5 })
  count: number;
}
