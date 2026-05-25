import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@savdo/db';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoresService } from './stores.service';

@Controller('stores/me')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.stores.get(user.storeId);
  }

  @Patch()
  @Roles(Role.OWNER)
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateStoreDto) {
    return this.stores.update(user.storeId, dto);
  }
}
