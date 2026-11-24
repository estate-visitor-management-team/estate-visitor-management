import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ConfirmExitDto {
  residentPhoneCalled!: true;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  callOutcome!: string;
}
