import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateVisitorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(250)
  purpose!: string;

  @IsDateString()
  expectedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  additionalInfo?: string;
}
