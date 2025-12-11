import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email адрес пользователя',
  })
  @IsEmail({}, { message: 'Некорректный email адрес' })
  @IsNotEmpty({ message: 'Email обязателен' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Пароль пользователя',
  })
  @IsString()
  @IsNotEmpty({ message: 'Пароль обязателен' })
  password: string;
}
