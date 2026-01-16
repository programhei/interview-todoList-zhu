import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { taskService, Task, CreateTaskDto } from '../services/task.service';
import { commentService, Comment } from '../services/comment.service';
import { teamService, Team } from '../services/team.service';
import { userService, User } from '../services/user.service';
import { notificationService, Notification } from '../services/notification.service';
import '../App.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [filter, setFilter] = useState({
    startTime: '',
    endTime: '',
    creatorId: '',
    assigneeId: '',
    orderBy: 'createdAt' as 'createdAt' | 'plannedFinishTime' | 'creatorId' | 'id',
    orderDirection: 'DESC' as 'ASC' | 'DESC',
  });
  const [newTask, setNewTask] = useState<CreateTaskDto>({
    title: '',
    description: '',
    repeatType: undefined,
    repeatInterval: 1,
    repeatEndDate: undefined,
  });
  const [newTaskWatchers, setNewTaskWatchers] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showSubTaskModal, setShowSubTaskModal] = useState(false);
  const [newSubTask, setNewSubTask] = useState<CreateTaskDto>({
    title: '',
    description: '',
  });
  const [taskFilterType, setTaskFilterType] = useState<'all' | 'my-created' | 'assigned-to-me' | 'watched'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadTasks();
    loadUsers();
    loadNotifications();
  }, [filter, taskFilterType]);

  useEffect(() => {
    loadTeams();
    // 每30秒刷新一次通知
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 点击外部关闭通知菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showNotifications && !target.closest('[data-notification-container]')) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showNotifications]);

  const loadUsers = async () => {
    try {
      const users = await userService.getList();
      setAllUsers(users);
      // 设置可用成员列表（用于筛选和指派）
      setAvailableMembers(users.map((u) => ({ id: u.id, name: u.name, email: u.email })));
    } catch (error) {
      console.error('加载用户列表失败:', error);
      // 如果加载失败，尝试从团队获取成员（作为后备）
      try {
        const teamData = await teamService.getAll();
        const allMembers: Array<{ id: string; name: string; email: string }> = [];
        for (const team of teamData) {
          try {
            const members = await teamService.getMembers(team.id);
            members.forEach((member) => {
              if (!allMembers.find((m) => m.id === member.id)) {
                allMembers.push(member);
              }
            });
          } catch (error) {
            console.error(`加载团队 ${team.id} 成员失败:`, error);
          }
        }
        setAvailableMembers(allMembers);
      } catch (teamError) {
        console.error('从团队加载成员失败:', teamError);
      }
    }
  };

  const loadTasks = async () => {
    try {
      const queryFilter = { ...filter };
      
      // 根据筛选类型设置筛选条件（优先级高于手动筛选）
      if (taskFilterType === 'my-created' && user?.id) {
        // 我创建的：强制使用当前用户ID，忽略手动选择的创建人
        queryFilter.creatorId = user.id;
        queryFilter.assigneeId = ''; // 清空任务人筛选
      } else if (taskFilterType === 'assigned-to-me' && user?.id) {
        // 指派给我：强制使用当前用户ID，忽略手动选择的任务人
        queryFilter.assigneeId = user.id;
        queryFilter.creatorId = ''; // 清空创建人筛选
      } else if (taskFilterType === 'watched') {
        // 我关注的：由后端自动筛选，清空创建人和任务人筛选
        queryFilter.creatorId = '';
        queryFilter.assigneeId = '';
      }
      // else: taskFilterType === 'all'，使用手动筛选条件
      
      const data = await taskService.getAll(queryFilter);
      
      // 如果是"我关注的"筛选，前端再过滤一次（后端已处理，这里作为双重保险）
      if (taskFilterType === 'watched' && user?.id) {
        const watchedTasks = data.filter((task) => 
          task.watchers?.some((w) => w.id === user.id)
        );
        setTasks(watchedTasks);
      } else {
        setTasks(data);
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  };

  const loadTeams = async () => {
    try {
      const data = await teamService.getAll();
      setTeams(data);
    } catch (error) {
      console.error('加载团队失败:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getAll(false),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('加载通知失败:', error);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('标记通知为已读失败:', error);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('标记所有通知为已读失败:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await notificationService.delete(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  const getNotificationTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      due_soon: '即将到期',
      overdue: '已逾期',
      assigned: '被指派',
      commented: '有评论',
      repeat_created: '重复任务已创建',
    };
    return typeMap[type] || type;
  };

  const getNotificationTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      due_soon: '#ff9500',
      overdue: '#f53f3f',
      assigned: '#165dff',
      commented: '#722ed1',
      repeat_created: '#00b42a',
    };
    return colorMap[type] || '#86909c';
  };

  const handleCreateTask = async () => {
    try {
      // 创建任务
      const createdTask = await taskService.create(newTask);
      
      // 如果有关注人，逐个添加
      for (const watcherId of newTaskWatchers) {
        try {
          await taskService.addWatcher(createdTask.id, watcherId);
        } catch (error) {
          console.error(`添加关注人 ${watcherId} 失败:`, error);
        }
      }
      
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', repeatType: undefined, repeatInterval: 1, repeatEndDate: undefined });
      setNewTaskWatchers([]);
      await loadTasks();
      
      // 如果创建了子任务，刷新父任务详情
      if (newTask.parentTaskId && selectedTask?.id === newTask.parentTaskId) {
        const updatedTask = await taskService.getById(newTask.parentTaskId);
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error('创建任务失败:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: 'todo' | 'in_progress' | 'done') => {
    try {
      await taskService.update(taskId, { status });
      await loadTasks();
      // 如果更新的是选中任务，刷新详情
      if (selectedTask?.id === taskId) {
        const updatedTask = await taskService.getById(taskId);
        setSelectedTask(updatedTask);
      }
      // 如果更新的是子任务，可能需要刷新主任务
      const task = tasks.find((t) => t.id === taskId);
      if (task?.parentTaskId && selectedTask?.id === task.parentTaskId) {
        const updatedParentTask = await taskService.getById(task.parentTaskId);
        setSelectedTask(updatedParentTask);
      }
    } catch (error) {
      console.error('更新任务状态失败:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('确定要删除这个任务吗？')) return;
    try {
      await taskService.delete(taskId);
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
      loadTasks();
    } catch (error) {
      console.error('删除任务失败:', error);
    }
  };

  const handleViewTask = async (task: Task) => {
    try {
      // 重新获取完整的任务详情（包括最新的watchers等信息）
      const fullTask = await taskService.getById(task.id);
      setSelectedTask(fullTask);
      const taskComments = await commentService.getByTask(task.id);
      setComments(taskComments);
    } catch (error) {
      console.error('加载任务详情失败:', error);
      // 如果获取失败，至少显示基本信息
      setSelectedTask(task);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    try {
      await commentService.create({
        content: newComment,
        taskId: selectedTask.id,
      });
      setNewComment('');
      const taskComments = await commentService.getByTask(selectedTask.id);
      setComments(taskComments);
    } catch (error) {
      console.error('添加评论失败:', error);
    }
  };

  const handleAssignTask = async (taskId: string, assigneeId: string) => {
    try {
      await taskService.assign(taskId, assigneeId);
      await loadTasks();
      if (selectedTask?.id === taskId) {
        const updatedTask = await taskService.getById(taskId);
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error('指派任务失败:', error);
    }
  };

  const handleAddWatcher = async (taskId: string, watcherId: string) => {
    try {
      await taskService.addWatcher(taskId, watcherId);
      await loadTasks();
      if (selectedTask?.id === taskId) {
        const updatedTask = await taskService.getById(taskId);
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error('添加关注人失败:', error);
    }
  };

  const handleRemoveWatcher = async (taskId: string, watcherId: string) => {
    try {
      await taskService.removeWatcher(taskId, watcherId);
      await loadTasks();
      if (selectedTask?.id === taskId) {
        const updatedTask = await taskService.getById(taskId);
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error('移除关注人失败:', error);
    }
  };

  const handleCreateSubTask = async () => {
    if (!selectedTask || !newSubTask.title.trim()) return;
    try {
      await taskService.create({
        ...newSubTask,
        parentTaskId: selectedTask.id,
      });
      setShowSubTaskModal(false);
      setNewSubTask({ title: '', description: '' });
      await loadTasks();
      // 刷新任务详情以显示新的子任务
      if (selectedTask) {
        const updatedTask = await taskService.getById(selectedTask.id);
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error('创建子任务失败:', error);
    }
  };

  const handleUpdateSubTaskStatus = async (subTaskId: string, status: 'todo' | 'in_progress' | 'done') => {
    try {
      await taskService.update(subTaskId, { status });
      await loadTasks();
      // 如果子任务完成，刷新主任务（后端会自动完成主任务）
      if (status === 'done' && selectedTask?.id) {
        const updatedTask = await taskService.getById(selectedTask.id);
        setSelectedTask(updatedTask);
      }
    } catch (error) {
      console.error('更新子任务状态失败:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return '#28a745';
      case 'in_progress':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="app">
      <header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        height: '64px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1d2129' }}>TodoList</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 通知按钮 */}
          <div style={{ position: 'relative' }} data-notification-container>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ position: 'relative', padding: '6px 12px', cursor: 'pointer' }}
              title="通知"
            >
              <span style={{ marginRight: '4px' }}>🔔</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#f53f3f',
                    color: 'white',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    minWidth: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {/* 通知下拉菜单 */}
            {showNotifications && (
              <div
                data-notification-container
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  width: '360px',
                  maxHeight: '480px',
                  background: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: '1px solid #e5e6eb',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e5e6eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1d2129' }}>
                    通知
                  </h3>
                  {notifications.length > 0 && (
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={handleMarkAllNotificationsAsRead}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      全部已读
                    </button>
                  )}
                </div>
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: '400px',
                  }}
                >
                  {notifications.length === 0 ? (
                    <div
                      style={{
                        padding: '32px',
                        textAlign: 'center',
                        color: '#86909c',
                        fontSize: '14px',
                      }}
                    >
                      暂无通知
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={async () => {
                          if (!notification.read) {
                            await handleMarkNotificationAsRead(notification.id);
                          }
                          if (notification.taskId) {
                            try {
                              const task = await taskService.getById(notification.taskId);
                              setSelectedTask(task);
                              setShowNotifications(false);
                            } catch (error) {
                              console.error('加载任务失败:', error);
                            }
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f7f8fa',
                          cursor: 'pointer',
                          background: notification.read ? 'white' : '#f0f9ff',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f7f8fa';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = notification.read ? 'white' : '#f0f9ff';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: getNotificationTypeColor(notification.type),
                                  color: 'white',
                                }}
                              >
                                {getNotificationTypeText(notification.type)}
                              </span>
                              {!notification.read && (
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: '#165dff',
                                  }}
                                />
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: '#1d2129', lineHeight: '1.5' }}>
                              {notification.message}
                            </div>
                            {notification.task && (
                              <div style={{ fontSize: '12px', color: '#86909c', marginTop: '4px' }}>
                                任务: {notification.task.title}
                              </div>
                            )}
                            <div style={{ fontSize: '11px', color: '#c9cdd4', marginTop: '4px' }}>
                              {new Date(notification.createdAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeleteNotification(notification.id);
                            }}
                            style={{
                              padding: '4px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#86909c',
                              fontSize: '14px',
                            }}
                            title="删除"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <span style={{ color: '#4e5969', fontSize: '14px' }}>{user?.name}</span>
          <button className="btn btn-secondary btn-small" onClick={logout}>
            退出
          </button>
        </div>
      </header>

      <div className="container" style={{ paddingTop: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: '16px', height: 'calc(100vh - 112px)' }}>
          {/* 左侧：任务列表 */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="card" style={{ padding: '16px', marginBottom: '12px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1d2129' }}>任务</h2>
                <button className="btn btn-primary btn-small" onClick={() => setShowCreateModal(true)}>
                  + 新建
                </button>
              </div>

              {/* 筛选器 */}
              <div style={{ padding: '12px', background: '#f7f8fa', borderRadius: '6px', marginBottom: '12px' }}>
                {/* 任务类型筛选 */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '6px', fontWeight: 500 }}>任务类型</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                      className={`btn ${taskFilterType === 'all' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                      onClick={() => {
                        setTaskFilterType('all');
                        setFilter({ ...filter, creatorId: '', assigneeId: '' });
                      }}
                    >
                      全部
                    </button>
                    <button
                      className={`btn ${taskFilterType === 'my-created' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                      onClick={() => {
                        setTaskFilterType('my-created');
                        setFilter({ ...filter, assigneeId: '' });
                      }}
                    >
                      我创建的
                    </button>
                    <button
                      className={`btn ${taskFilterType === 'assigned-to-me' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                      onClick={() => {
                        setTaskFilterType('assigned-to-me');
                        setFilter({ ...filter, creatorId: '' });
                      }}
                    >
                      指派给我
                    </button>
                    <button
                      className={`btn ${taskFilterType === 'watched' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                      onClick={() => {
                        setTaskFilterType('watched');
                        setFilter({ ...filter, creatorId: '', assigneeId: '' });
                      }}
                    >
                      我关注的
                    </button>
                  </div>
                </div>

                {/* 时间段筛选 */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '6px', fontWeight: 500 }}>时间段</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="datetime-local"
                      value={filter.startTime}
                      onChange={(e) => setFilter({ ...filter, startTime: e.target.value })}
                      placeholder="开始时间"
                      style={{ 
                        flex: 1, 
                        padding: '6px 10px', 
                        fontSize: '12px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    />
                    <input
                      type="datetime-local"
                      value={filter.endTime}
                      onChange={(e) => setFilter({ ...filter, endTime: e.target.value })}
                      placeholder="结束时间"
                      style={{ 
                        flex: 1, 
                        padding: '6px 10px', 
                        fontSize: '12px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    />
                  </div>
                </div>

                {/* 创建人和任务人筛选 */}
                <div style={{ marginBottom: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px', fontWeight: 500 }}>创建人</div>
                    <select
                      value={filter.creatorId || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilter({ ...filter, creatorId: value || '' });
                        if (value) {
                          setTaskFilterType('all');
                        }
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '6px 10px', 
                        fontSize: '12px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      <option value="">全部创建人</option>
                      {availableMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px', fontWeight: 500 }}>任务人</div>
                    <select
                      value={filter.assigneeId || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilter({ ...filter, assigneeId: value || '' });
                        if (value) {
                          setTaskFilterType('all');
                        }
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '6px 10px', 
                        fontSize: '12px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      <option value="">全部任务人</option>
                      {availableMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 排序 */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '6px', fontWeight: 500 }}>排序</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={filter.orderBy}
                      onChange={(e) => setFilter({ ...filter, orderBy: e.target.value as any })}
                      style={{ 
                        flex: 1, 
                        padding: '6px 10px', 
                        fontSize: '12px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      <option value="createdAt">创建时间</option>
                      <option value="plannedFinishTime">计划完成时间</option>
                      <option value="creatorId">创建者</option>
                      <option value="id">ID</option>
                    </select>
                    <select
                      value={filter.orderDirection}
                      onChange={(e) => setFilter({ ...filter, orderDirection: e.target.value as any })}
                      style={{ 
                        width: '90px', 
                        padding: '6px 10px', 
                        fontSize: '12px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      <option value="DESC">降序 ↓</option>
                      <option value="ASC">升序 ↑</option>
                    </select>
                  </div>
                </div>

                {/* 清除筛选按钮 */}
                {(filter.startTime || filter.endTime || filter.creatorId || filter.assigneeId || filter.orderBy !== 'createdAt' || filter.orderDirection !== 'DESC') && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => {
                      setFilter({
                        startTime: '',
                        endTime: '',
                        creatorId: '',
                        assigneeId: '',
                        orderBy: 'createdAt',
                        orderDirection: 'DESC',
                      });
                      setTaskFilterType('all');
                    }}
                    style={{ width: '100%', marginTop: '8px' }}
                  >
                    清除筛选
                  </button>
                )}
              </div>
            </div>

            {/* 任务列表 */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`task-card ${selectedTask?.id === task.id ? 'selected' : ''}`}
                    onClick={() => handleViewTask(task)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        fontWeight: 500, 
                        color: '#1d2129',
                        flex: 1,
                        lineHeight: '20px'
                      }}>
                        {task.title}
                      </h3>
                      <span className={`status-badge status-${task.status === 'done' ? 'done' : task.status === 'in_progress' ? 'in-progress' : 'todo'}`}>
                        {task.status === 'done' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待办'}
                      </span>
                    </div>
                    {task.description && (
                      <p style={{ 
                        fontSize: '12px', 
                        color: '#86909c', 
                        marginBottom: '8px',
                        lineHeight: '18px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      fontSize: '12px',
                      color: '#86909c',
                      flexWrap: 'wrap'
                    }}>
                      {task.creator && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>👤</span>
                          <span>{task.creator.name}</span>
                        </span>
                      )}
                      {task.assignee && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>→</span>
                          <span>{task.assignee.name}</span>
                        </span>
                      )}
                      {task.plannedFinishTime && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📅</span>
                          <span>{new Date(task.plannedFinishTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                        </span>
                      )}
                      {task.subTasks && task.subTasks.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📋</span>
                          <span>{task.subTasks.length} 子任务</span>
                        </span>
                      )}
                    </div>
                  </div>
                    ))}
                {tasks.length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#86909c',
                    fontSize: '14px'
                  }}>
                    暂无任务
                  </div>
                )}
              </div>
          </div>

          {/* 右侧：任务详情 */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {selectedTask ? (
              <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ marginBottom: '20px', borderBottom: '1px solid #e5e6eb', paddingBottom: '16px' }}>
                  <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 600, color: '#1d2129' }}>
                    {selectedTask.title}
                  </h2>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`status-badge status-${selectedTask.status === 'done' ? 'done' : selectedTask.status === 'in_progress' ? 'in-progress' : 'todo'}`}>
                      {selectedTask.status === 'done' ? '已完成' : selectedTask.status === 'in_progress' ? '进行中' : '待办'}
                    </span>
                    <select
                      value={selectedTask.status}
                      onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value as any)}
                      style={{ 
                        padding: '4px 12px',
                        fontSize: '12px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      <option value="todo">待办</option>
                      <option value="in_progress">进行中</option>
                      <option value="done">已完成</option>
                    </select>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteTask(selectedTask.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>

                {selectedTask.description && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1d2129', marginBottom: '8px' }}>描述</h3>
                    <p style={{ fontSize: '14px', color: '#4e5969', lineHeight: '22px', whiteSpace: 'pre-wrap' }}>
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                {/* 指派和关注人管理 */}
                <div style={{ marginBottom: '20px', padding: '12px', background: '#f7f8fa', borderRadius: '6px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1d2129', marginBottom: '12px' }}>指派和关注</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 指派执行人 */}
                    <div>
                      <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px' }}>执行人</div>
                      <select
                        value={selectedTask.assigneeId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignTask(selectedTask.id, e.target.value);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '14px',
                          border: '1px solid #e5e6eb',
                          borderRadius: '4px',
                          background: 'white'
                        }}
                      >
                        <option value="">未指派</option>
                        {availableMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name} ({member.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 关注人 */}
                    <div>
                      <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px' }}>关注人</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {selectedTask.watchers && selectedTask.watchers.length > 0 ? (
                          selectedTask.watchers.map((watcher) => (
                            <span
                              key={watcher.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                background: 'white',
                                border: '1px solid #e5e6eb',
                                borderRadius: '12px',
                                fontSize: '12px'
                              }}
                            >
                              {watcher.name}
                              <button
                                onClick={() => handleRemoveWatcher(selectedTask.id, watcher.id)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  color: '#86909c',
                                  fontSize: '14px',
                                  padding: 0,
                                  width: '16px',
                                  height: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: '#86909c' }}>无关注人</span>
                        )}
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddWatcher(selectedTask.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          fontSize: '14px',
                          border: '1px solid #e5e6eb',
                          borderRadius: '4px',
                          background: 'white'
                        }}
                      >
                        <option value="">添加关注人...</option>
                        {availableMembers
                          .filter((m) => !selectedTask.watchers?.some((w) => w.id === m.id))
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({member.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px' }}>创建者</div>
                    <div style={{ fontSize: '14px', color: '#1d2129' }}>{selectedTask.creator?.name || '未知'}</div>
                  </div>
                  {selectedTask.assignee && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px' }}>执行人</div>
                      <div style={{ fontSize: '14px', color: '#1d2129' }}>{selectedTask.assignee.name}</div>
                    </div>
                  )}
                  {selectedTask.plannedFinishTime && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px' }}>计划完成时间</div>
                      <div style={{ fontSize: '14px', color: '#1d2129' }}>
                        {new Date(selectedTask.plannedFinishTime).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '12px', color: '#86909c', marginBottom: '4px' }}>创建时间</div>
                    <div style={{ fontSize: '14px', color: '#1d2129' }}>
                      {new Date(selectedTask.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>

                {/* 子任务 */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1d2129', margin: 0 }}>子任务</h3>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => setShowSubTaskModal(true)}
                    >
                      + 添加子任务
                    </button>
                  </div>
                  {selectedTask.subTasks && selectedTask.subTasks.length > 0 ? (
                    selectedTask.subTasks.map((subTask) => (
                      <div 
                        key={subTask.id} 
                        style={{ 
                          padding: '12px', 
                          background: '#f7f8fa', 
                          marginBottom: '8px', 
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '14px', color: '#1d2129', flex: 1 }}>{subTask.title}</span>
                        <select
                          value={subTask.status}
                          onChange={(e) => handleUpdateSubTaskStatus(subTask.id, e.target.value as any)}
                          style={{ 
                            padding: '4px 12px',
                            fontSize: '12px',
                            border: '1px solid #e5e6eb',
                            borderRadius: '4px',
                            background: 'white'
                          }}
                        >
                          <option value="todo">待办</option>
                          <option value="in_progress">进行中</option>
                          <option value="done">已完成</option>
                        </select>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#86909c', fontSize: '12px' }}>
                      暂无子任务
                    </div>
                  )}
                </div>

                {/* 评论/历史记录 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTop: '1px solid #e5e6eb', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1d2129', marginBottom: '12px' }}>评论</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="添加评论..."
                      style={{ 
                        width: '100%', 
                        minHeight: '80px', 
                        padding: '10px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        marginBottom: '8px'
                      }}
                    />
                    <button className="btn btn-primary btn-small" onClick={handleAddComment}>
                      添加评论
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {comments.map((comment) => (
                      <div 
                        key={comment.id} 
                        style={{ 
                          padding: '12px', 
                          background: '#f7f8fa', 
                          marginBottom: '8px', 
                          borderRadius: '6px'
                        }}
                      >
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#86909c', 
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{ fontWeight: 500, color: '#1d2129' }}>{comment.user?.name || '未知'}</span>
                          <span>•</span>
                          <span>{new Date(comment.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#1d2129', lineHeight: '20px', whiteSpace: 'pre-wrap' }}>
                          {comment.content}
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px',
                        color: '#86909c',
                        fontSize: '14px'
                      }}>
                        暂无评论
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#86909c', fontSize: '14px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
                  <div>选择一个任务查看详情</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 创建任务模态框 */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '500px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>新建任务</h2>
            <div className="form-group">
              <label>标题 *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>父任务（创建子任务）</label>
              <select
                value={newTask.parentTaskId || ''}
                onChange={(e) => setNewTask({ ...newTask, parentTaskId: e.target.value || undefined })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">无（创建独立任务）</option>
                {tasks
                  .filter((t) => !t.parentTaskId) // 只显示主任务
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>指派执行人</label>
              <select
                value={newTask.assigneeId || ''}
                onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value || undefined })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">未指派</option>
                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>添加关注人</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && !newTaskWatchers.includes(e.target.value)) {
                    setNewTaskWatchers([...newTaskWatchers, e.target.value]);
                    e.target.value = '';
                  }
                }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">选择关注人...</option>
                {availableMembers
                  .filter((m) => m.id !== newTask.assigneeId && !newTaskWatchers.includes(m.id))
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
              </select>
              {newTaskWatchers.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {newTaskWatchers.map((watcherId) => {
                    const watcher = availableMembers.find((m) => m.id === watcherId);
                    return watcher ? (
                      <span
                        key={watcherId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          background: '#f7f8fa',
                          border: '1px solid #e5e6eb',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                      >
                        {watcher.name}
                        <button
                          onClick={() => setNewTaskWatchers(newTaskWatchers.filter((id) => id !== watcherId))}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#86909c',
                            fontSize: '14px',
                            padding: 0,
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>计划完成时间</label>
              <input
                type="datetime-local"
                value={newTask.plannedFinishTime || ''}
                onChange={(e) => setNewTask({ ...newTask, plannedFinishTime: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>重复类型</label>
              <select
                value={newTask.repeatType || ''}
                onChange={(e) => setNewTask({ ...newTask, repeatType: e.target.value as any || undefined })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">不重复</option>
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
                <option value="yearly">每年</option>
              </select>
            </div>
            {newTask.repeatType && (
              <>
                <div className="form-group">
                  <label>重复间隔</label>
                  <input
                    type="number"
                    min="1"
                    value={newTask.repeatInterval || 1}
                    onChange={(e) => setNewTask({ ...newTask, repeatInterval: parseInt(e.target.value) || 1 })}
                    placeholder="例如：每2天输入2"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label>重复结束日期（可选）</label>
                  <input
                    type="datetime-local"
                    value={newTask.repeatEndDate || ''}
                    onChange={(e) => setNewTask({ ...newTask, repeatEndDate: e.target.value || undefined })}
                  />
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateTask}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建子任务模态框 */}
      {showSubTaskModal && selectedTask && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSubTaskModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '500px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>新建子任务</h2>
            <p style={{ fontSize: '12px', color: '#86909c', marginBottom: '16px' }}>
              主任务：{selectedTask.title}
            </p>
            <div className="form-group">
              <label>标题 *</label>
              <input
                type="text"
                value={newSubTask.title}
                onChange={(e) => setNewSubTask({ ...newSubTask, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>描述</label>
              <textarea
                value={newSubTask.description}
                onChange={(e) => setNewSubTask({ ...newSubTask, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>指派执行人</label>
              <select
                value={newSubTask.assigneeId || ''}
                onChange={(e) => setNewSubTask({ ...newSubTask, assigneeId: e.target.value || undefined })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">未指派</option>
                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>计划完成时间</label>
              <input
                type="datetime-local"
                value={newSubTask.plannedFinishTime || ''}
                onChange={(e) => setNewSubTask({ ...newSubTask, plannedFinishTime: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowSubTaskModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateSubTask}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
