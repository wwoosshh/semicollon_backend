import {
  IsObject,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

const MAX_ANSWER_KEYS = 30;
const MAX_ANSWER_LENGTH = 2000;

// answers는 "문자열 값만, 키 30개 이하, 값 2000자 이하"의 평면 객체여야 한다.
// 공개 엔드포인트라 1MB JSON 같은 임의 구조가 DB에 그대로 저장되는 것을 막는다.
function IsAnswersRecord(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAnswersRecord',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          ) {
            return false;
          }
          const entries = Object.entries(value);
          if (entries.length > MAX_ANSWER_KEYS) return false;
          return entries.every(
            ([, v]) => typeof v === 'string' && v.length <= MAX_ANSWER_LENGTH,
          );
        },
      },
    });
  };
}

export class CreateApplicationDto {
  @IsString()
  @MinLength(1, { message: '이름을 입력해 주세요.' })
  @MaxLength(100, { message: '이름은 100자 이하여야 합니다.' })
  name: string;

  @IsString()
  @MinLength(1, { message: '연락처를 입력해 주세요.' })
  @MaxLength(50, { message: '연락처는 50자 이하여야 합니다.' })
  contact: string;

  @IsObject({ message: '답변 형식이 올바르지 않습니다.' })
  @IsAnswersRecord({ message: '답변 형식이 올바르지 않습니다.' })
  answers: Record<string, string>;
}
