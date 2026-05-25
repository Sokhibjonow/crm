import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(['ru', 'uz'])
  locale?: string;
}
