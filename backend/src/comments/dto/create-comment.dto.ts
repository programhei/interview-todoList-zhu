import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: '任务进展顺利' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'task-id' })
  @IsUUID()
  taskId: string;
}
