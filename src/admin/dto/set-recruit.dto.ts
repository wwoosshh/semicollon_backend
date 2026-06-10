import { IsISO8601, IsOptional } from 'class-validator';

export class SetRecruitDto {
  @IsOptional()
  @IsISO8601({}, { message: '시작일 형식이 올바르지 않습니다.' })
  start?: string | null;

  @IsOptional()
  @IsISO8601({}, { message: '마감일 형식이 올바르지 않습니다.' })
  end?: string | null;
}
