import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['pending', 'accepted', 'rejected'])
  status: 'pending' | 'accepted' | 'rejected';
}
