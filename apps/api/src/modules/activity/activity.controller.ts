import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@savdo/db';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { ActivityService } from './activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';

@Controller('activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.MANAGER)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ActivityQueryDto) {
    return this.activity.list(user.storeId, query);
  }
}
