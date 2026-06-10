import { IsString, MinLength } from 'class-validator';

export class SetInviteCodeDto {
  @IsString()
  @MinLength(6, { message: '초대 코드는 6자 이상이어야 합니다.' })
  code: string;
}
