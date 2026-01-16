import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum OrderBy {
  CREATED_AT = 'createdAt',
  PLANNED_FINISH_TIME = 'plannedFinishTime',
  CREATOR = 'creatorId',
  ID = 'id',
}

export enum OrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class QueryTaskDto {
  @ApiProperty({ example: '2024-01-01T00:00:00Z', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  startTime?: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  endTime?: string;

  @ApiProperty({ example: 'creator-user-id', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  creatorId?: string;

  @ApiProperty({ example: 'assignee-user-id', required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({ enum: OrderBy, required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(OrderBy)
  orderBy?: OrderBy;

  @ApiProperty({ enum: OrderDirection, required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(OrderDirection)
  orderDirection?: OrderDirection;
}
