import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';
import { Comment } from '../../comments/entities/comment.entity';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum RepeatType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({ type: 'uuid', nullable: true })
  parentTaskId: string;

  @ManyToOne(() => Task, (task) => task.subTasks, { nullable: true })
  @JoinColumn({ name: 'parentTaskId' })
  parentTask: Task;

  @OneToMany(() => Task, (task) => task.parentTask)
  subTasks: Task[];

  @Column({ type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => User, (user) => user.createdTasks)
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'uuid', nullable: true })
  assigneeId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'task_watchers',
    joinColumn: { name: 'taskId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  })
  watchers: User[];

  @Column({ type: 'uuid', nullable: true })
  teamId: string;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @Column({ type: 'timestamp', nullable: true })
  plannedFinishTime: Date;

  @Column({
    type: 'enum',
    enum: RepeatType,
    nullable: true,
  })
  repeatType: RepeatType;

  @Column({ type: 'int', nullable: true, default: 1 })
  repeatInterval: number; // 重复间隔，如每2天

  @Column({ type: 'timestamp', nullable: true })
  repeatEndDate: Date; // 重复结束日期

  @Column({ type: 'timestamp', nullable: true })
  nextRepeatDate: Date; // 下次重复日期

  @Column({ type: 'uuid', nullable: true })
  originalTaskId: string; // 原始任务ID，用于关联重复任务

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'originalTaskId' })
  originalTask: Task; // 原始任务

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Comment, (comment) => comment.task)
  comments: Comment[];
}
