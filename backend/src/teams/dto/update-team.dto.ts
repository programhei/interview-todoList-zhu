import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateTeamDto {
  @ApiProperty({ example: '开发团队', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '负责产品开发', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
