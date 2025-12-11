import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email адрес пользователя',
  })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Пароль пользователя (минимально 8 символов, должен содержать цифры и буквы)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Пароль должен содержать заглавные и строчные буквы, а также цифру',
  })
  password: string;

  @ApiProperty({
    example: 'john_doe',
    description: 'Имя пользователя',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @IsNotEmpty({ message: 'Имя пользователя обязательно' })
  @MinLength(3, {
    message: 'Имя пользователя должно содержать минимум 3 символа',
  })
  @MaxLength(30, { message: 'Имя пользователя не может превышать 30 символов' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание',
  })
  username: string;
}
