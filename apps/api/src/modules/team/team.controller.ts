import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@savdo/db';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateMemberDto } from './dto/create-member.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TeamService } from './team.service';

@Controller('team')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.team.list(user.storeId);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.team.get(user.storeId, id);
  }

  @Post()
  @Roles(Role.OWNER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMemberDto) {
    return this.team.create(user.storeId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.team.update(user.storeId, user.userId, id, dto);
  }

  @Post(':id/reset-password')
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.team.resetPassword(user.storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  deactivate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.team.deactivate(user.storeId, user.userId, id);
  }
}
