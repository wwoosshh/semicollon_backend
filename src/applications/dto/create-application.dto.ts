import { IsObject, IsString, MinLength } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @MinLength(1, { message: '이름을 입력해 주세요.' })
  name: string;

  @IsString()
  @MinLength(1, { message: '연락처를 입력해 주세요.' })
  contact: string;

  @IsObject({ message: '답변 형식이 올바르지 않습니다.' })
  answers: Record<string, string>;
}
