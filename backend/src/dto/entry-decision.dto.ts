import {
  IsIn,
} from 'class-validator';

export class EntryDecisionDto {
  @IsIn(['ACCEPTED', 'REJECTED'])
  decision!: 'ACCEPTED' | 'REJECTED';
}
