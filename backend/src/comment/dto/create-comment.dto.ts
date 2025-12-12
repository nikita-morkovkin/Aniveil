import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Содержание комментария',
    example: 'Это очень хорошее аниме!',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}




