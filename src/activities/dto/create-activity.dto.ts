import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @MinLength(1, { message: '제목을 입력해 주세요.' })
  title: string;

  @IsString()
  @MinLength(1, { message: '설명을 입력해 주세요.' })
  description: string;

  @IsIn(['project', 'study', 'event'])
  type: 'project' | 'study' | 'event';

  @IsInt()
  @Min(2000)
  year: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
