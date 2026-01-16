# TodoList 任务管理系统

一个基于 Nest.js 和 React 的全栈任务管理系统，支持用户注册登录、团队协作、任务管理、子任务、评论等功能。

## 技术栈

### 后端
- **框架**: Nest.js
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: TypeORM
- **认证**: JWT (Passport)
- **API文档**: Swagger

### 前端
- **框架**: React
- **语言**: TypeScript
- **HTTP客户端**: Axios
- **路由**: React Router

### 部署
- **容器化**: Docker & Docker Compose

## 功能特性

- ✅ 用户注册/登录
- ✅ 团队管理（创建团队、添加/移除成员）
- ✅ 任务增删改查
- ✅ 任务指派执行人和关注人
- ✅ 子任务功能（子任务完成后自动完成主任务）
- ✅ 任务历史记录和评论
- ✅ 内容筛选（时段、创作人、任务人）
- ✅ 排序功能（创建时间、计划完成时间、创建者、ID）
- ✅ API文档（Swagger）

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

访问：
- 前端: http://localhost:3001
- 后端API: http://localhost:3000
- Swagger文档: http://localhost:3000/api

### 本地开发

#### 后端

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量（复制 .env.example 为 .env 并修改）
cp .env.example .env

# 启动PostgreSQL数据库（使用Docker）
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=todolist -p 5432:5432 postgres:15-alpine

# 启动开发服务器
npm run start:dev
```

#### 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

## API文档

启动后端服务后，访问 http://localhost:3000/api 查看完整的 Swagger API 文档。

## 数据库结构

- **users**: 用户表
- **teams**: 团队表
- **team_members**: 团队成员关系表
- **tasks**: 任务表
- **task_watchers**: 任务关注人关系表
- **comments**: 评论表

## 功能规划文档

### 消息提醒任务即将到期

**Schema设计**:
- 创建 `notifications` 表，包含字段：
  - id (UUID)
  - userId (用户ID)
  - taskId (任务ID)
  - type (通知类型: 'due_soon', 'overdue', 'assigned', 'commented')
  - message (通知内容)
  - read (是否已读)
  - createdAt

**实现流程**:
1. 使用 Nest.js 的 `@nestjs/schedule` 模块创建定时任务
2. 每天定时检查所有任务的 `plannedFinishTime`
3. 对于即将到期（如24小时内）的任务，创建通知记录
4. 使用 WebSocket 或 Server-Sent Events (SSE) 实时推送通知给用户
5. 前端轮询或使用 WebSocket 接收通知并显示

**服务**:
- NotificationService: 处理通知的创建、查询、标记已读
- ScheduleService: 定时检查任务到期时间
- WebSocketGateway: 实时推送通知

### 定时重复任务

**Schema设计**:
- 在 `tasks` 表中添加字段：
  - repeatType (重复类型: 'daily', 'weekly', 'monthly', 'yearly', 'custom')
  - repeatInterval (重复间隔，如每2天)
  - repeatEndDate (重复结束日期)
  - nextRepeatDate (下次重复日期)
  - originalTaskId (原始任务ID，用于关联重复任务)

**实现流程**:
1. 创建任务时，如果设置了重复规则，保存到数据库
2. 使用定时任务（Cron Job）每天检查需要重复的任务
3. 根据重复规则创建新的任务实例
4. 更新原任务的 `nextRepeatDate`
5. 如果设置了 `repeatEndDate`，到期后停止创建新任务

**服务**:
- TaskRepeatService: 处理重复任务的创建逻辑
- ScheduleService: 定时检查并创建重复任务

## 许可证

MIT
