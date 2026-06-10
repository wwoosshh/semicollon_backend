import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail({}, { message: '올바른 이메일을 입력해 주세요.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password!: string;

  @IsString()
  @MinLength(1, { message: '이름을 입력해 주세요.' })
  name!: string;

  @IsInt()
  @Min(1)
  generation!: number;

  @IsString()
  inviteCode!: string;
}
