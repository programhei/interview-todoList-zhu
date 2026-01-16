import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { TaskStatus, RepeatType } from '../entities/task.entity';

export class UpdateTaskDto {
  @ApiProperty({ example: '完成项目文档', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: '需要完成API文档和用户手册', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskStatus, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ example: 'assignee-user-id', required: false })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  plannedFinishTime?: Date;

  @ApiProperty({ enum: RepeatType, required: false, description: '重复类型' })
  @IsOptional()
  @IsEnum(RepeatType)
  repeatType?: RepeatType;

  @ApiProperty({ example: 1, required: false, description: '重复间隔，如每2天' })
  @IsOptional()
  @IsInt()
  @Min(1)
  repeatInterval?: number;

  @ApiProperty({ example: '2025-12-31T23:59:59Z', required: false, description: '重复结束日期' })
  @IsOptional()
  @IsDateString()
  repeatEndDate?: Date;
}
