import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdjustStockDto {
  @Type(() => Number)
  @IsInt()
  delta!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
