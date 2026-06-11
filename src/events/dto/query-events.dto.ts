import { IsISO8601, IsOptional } from 'class-validator';

export class QueryEventsDto {
  @IsOptional()
  @IsISO8601({}, { message: 'from은 ISO8601 날짜 형식이어야 합니다.' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'to는 ISO8601 날짜 형식이어야 합니다.' })
  to?: string;
}
