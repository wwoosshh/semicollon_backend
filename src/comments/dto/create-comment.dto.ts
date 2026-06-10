import { IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1, { message: '내용을 입력해 주세요.' })
  content: string;
}
