import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('团队')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: '创建团队' })
  create(@Body() createTeamDto: CreateTeamDto, @Request() req) {
    return this.teamsService.create(createTeamDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取团队列表' })
  findAll(@Request() req) {
    return this.teamsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取团队详情' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.teamsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新团队' })
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto, @Request() req) {
    return this.teamsService.update(id, updateTeamDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除团队' })
  remove(@Param('id') id: string, @Request() req) {
    return this.teamsService.remove(id, req.user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: '添加团队成员' })
  addMember(
    @Param('id') id: string,
    @Body('memberId') memberId: string,
    @Request() req,
  ) {
    return this.teamsService.addMember(id, memberId, req.user.id);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: '移除团队成员' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return this.teamsService.removeMember(id, memberId, req.user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '获取团队成员列表' })
  getMembers(@Param('id') id: string, @Request() req) {
    return this.teamsService.getMembers(id, req.user.id);
  }
}
