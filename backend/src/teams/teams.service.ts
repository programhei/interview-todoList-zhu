import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private teamMembersRepository: Repository<TeamMember>,
  ) {}

  async create(createTeamDto: CreateTeamDto, userId: string): Promise<Team> {
    const team = this.teamsRepository.create({
      ...createTeamDto,
      creatorId: userId,
    });
    const savedTeam = await this.teamsRepository.save(team);

    // 创建者自动成为团队成员
    await this.addMember(savedTeam.id, userId, userId);

    return this.findOne(savedTeam.id, userId);
  }

  async findAll(userId: string): Promise<Team[]> {
    return this.teamsRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.creator', 'creator')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .where('team.creatorId = :userId OR EXISTS (SELECT 1 FROM team_members tm WHERE tm."teamId" = team.id AND tm."userId" = :userId)', { userId })
      .getMany();
  }

  async findOne(id: string, userId: string): Promise<Team> {
    const team = await this.teamsRepository.findOne({
      where: { id },
      relations: ['creator', 'members', 'members.user'],
    });

    if (!team) {
      throw new NotFoundException('团队不存在');
    }

    // 检查权限
    const isCreator = team.creatorId === userId;
    const isMember = team.members?.some((m) => m.userId === userId);

    if (!isCreator && !isMember) {
      throw new ForbiddenException('无权访问此团队');
    }

    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto, userId: string): Promise<Team> {
    const team = await this.findOne(id, userId);

    // 只有创建者可以修改
    if (team.creatorId !== userId) {
      throw new ForbiddenException('无权修改此团队');
    }

    Object.assign(team, updateTeamDto);
    return this.teamsRepository.save(team).then(() => this.findOne(id, userId));
  }

  async remove(id: string, userId: string): Promise<void> {
    const team = await this.findOne(id, userId);

    // 只有创建者可以删除
    if (team.creatorId !== userId) {
      throw new ForbiddenException('无权删除此团队');
    }

    await this.teamsRepository.remove(team);
  }

  async addMember(teamId: string, memberId: string, userId: string): Promise<Team> {
    const team = await this.findOne(teamId, userId);

    // 只有创建者可以添加成员
    if (team.creatorId !== userId) {
      throw new ForbiddenException('无权添加成员');
    }

    const existingMember = await this.teamMembersRepository.findOne({
      where: { teamId, userId: memberId },
    });

    if (existingMember) {
      return this.findOne(teamId, userId);
    }

    const member = this.teamMembersRepository.create({
      teamId,
      userId: memberId,
    });
    await this.teamMembersRepository.save(member);

    return this.findOne(teamId, userId);
  }

  async removeMember(teamId: string, memberId: string, userId: string): Promise<Team> {
    const team = await this.findOne(teamId, userId);

    // 只有创建者可以移除成员
    if (team.creatorId !== userId) {
      throw new ForbiddenException('无权移除成员');
    }

    const member = await this.teamMembersRepository.findOne({
      where: { teamId, userId: memberId },
    });

    if (member) {
      await this.teamMembersRepository.remove(member);
    }

    return this.findOne(teamId, userId);
  }

  async getMembers(teamId: string, userId: string): Promise<any[]> {
    const team = await this.findOne(teamId, userId);
    const members = team.members?.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
    })) || [];
    // 包含创建者
    if (team.creator) {
      const creatorInList = members.some((m) => m.id === team.creatorId);
      if (!creatorInList) {
        members.unshift({
          id: team.creator.id,
          name: team.creator.name,
          email: team.creator.email,
        });
      }
    }
    return members;
  }
}
