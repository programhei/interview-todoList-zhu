import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: '开发团队' })
  @IsString()
  name: string;

  @ApiProperty({ example: '负责产品开发', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
