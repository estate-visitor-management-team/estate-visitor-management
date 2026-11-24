import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum EstateUserRole {
  RESIDENT = 'RESIDENT',
  SECURITY = 'SECURITY',
}

export class CreateUserDto {
  @IsEnum(EstateUserRole)
  role!: EstateUserRole;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  username!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsUUID()
  houseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  staffId?: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  temporaryPassword!: string;
}
