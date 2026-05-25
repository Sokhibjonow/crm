import { IsEnum } from 'class-validator';
import { OrderStatus } from '@savdo/db';

export class UpdateStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
