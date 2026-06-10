import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

class HistoryItemDto {
  @IsString() @MinLength(1) year!: string;
  @IsString() @MinLength(1) title!: string;
}

class StaffItemDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) role!: string;
  @IsOptional() @IsString() note?: string;
}

class FaqItemDto {
  @IsString() @MinLength(1) q!: string;
  @IsString() @MinLength(1) a!: string;
}

export class SetAboutDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => HistoryItemDto) history!: HistoryItemDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => StaffItemDto) staff!: StaffItemDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => FaqItemDto) faq!: FaqItemDto[];
}
