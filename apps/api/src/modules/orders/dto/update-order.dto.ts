import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
