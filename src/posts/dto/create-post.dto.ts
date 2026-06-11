import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(1, { message: '제목을 입력해 주세요.' })
  title: string;

  @IsString()
  @MinLength(1, { message: '내용을 입력해 주세요.' })
  content: string;

  @IsIn(['notice', 'blog'])
  category: 'notice' | 'blog';

  @IsIn(['public', 'member'])
  visibility: 'public' | 'member';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];
}
