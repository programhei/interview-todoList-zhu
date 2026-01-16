import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('任务')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: '创建任务' })
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.tasksService.create(createTaskDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取任务列表（支持筛选和排序）' })
  findAll(@Query() queryDto: QueryTaskDto, @Request() req) {
    return this.tasksService.findAll(queryDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.tasksService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新任务' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Request() req) {
    return this.tasksService.update(id, updateTaskDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务' })
  remove(@Param('id') id: string, @Request() req) {
    return this.tasksService.remove(id, req.user.id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: '指派任务执行人' })
  assignTask(
    @Param('id') id: string,
    @Body('assigneeId') assigneeId: string,
    @Request() req,
  ) {
    return this.tasksService.assignTask(id, assigneeId, req.user.id);
  }

  @Post(':id/watchers')
  @ApiOperation({ summary: '添加关注人' })
  addWatcher(
    @Param('id') id: string,
    @Body('watcherId') watcherId: string,
    @Request() req,
  ) {
    return this.tasksService.addWatcher(id, watcherId, req.user.id);
  }

  @Delete(':id/watchers/:watcherId')
  @ApiOperation({ summary: '移除关注人' })
  removeWatcher(
    @Param('id') id: string,
    @Param('watcherId') watcherId: string,
    @Request() req,
  ) {
    return this.tasksService.removeWatcher(id, watcherId, req.user.id);
  }
}
