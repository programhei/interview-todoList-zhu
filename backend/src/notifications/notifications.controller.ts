import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto, UnreadCountResponseDto } from './dto/notification-response.dto';

@ApiTags('通知')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '获取通知列表' })
  @ApiQuery({ name: 'unreadOnly', required: false, description: '是否只获取未读通知', type: String, example: 'true' })
  @ApiResponse({ status: 200, description: '返回通知列表', type: [NotificationResponseDto] })
  async findAll(@Request() req: any, @Query('unreadOnly') unreadOnly?: string) {
    const userId = req.user.id;
    const unreadOnlyFlag = unreadOnly === 'true';
    return await this.notificationsService.findAll(userId, unreadOnlyFlag);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  @ApiResponse({ status: 200, description: '返回未读通知数量', type: UnreadCountResponseDto })
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.id;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  @ApiParam({ name: 'id', description: '通知ID', type: String })
  @ApiResponse({ status: 200, description: '通知已标记为已读', type: NotificationResponseDto })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    return await this.notificationsService.markAsRead(id, userId);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: '标记所有通知为已读' })
  @ApiResponse({ status: 200, description: '所有通知已标记为已读' })
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.id;
    await this.notificationsService.markAllAsRead(userId);
    return { message: '所有通知已标记为已读' };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  @ApiParam({ name: 'id', description: '通知ID', type: String })
  @ApiResponse({ status: 200, description: '通知已删除' })
  async delete(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    await this.notificationsService.delete(id, userId);
    return { message: '通知已删除' };
  }
}
