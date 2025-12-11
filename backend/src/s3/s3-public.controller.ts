import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  FileExistsResponseDto,
  GetSignedUrlDto,
  GetUrlDto,
  GetUrlResponseDto,
} from './dto';
import { S3Service } from './s3.service';

@ApiTags('S3 Storage (Public)')
@Controller('s3')
export class S3PublicController {
  constructor(private readonly s3Service: S3Service) {}

  @Get('url')
  @ApiOperation({ summary: 'Получить публичный URL файла' })
  @ApiResponse({ status: 200, type: GetUrlResponseDto })
  getPublicUrl(@Query() dto: GetUrlDto): GetUrlResponseDto {
    return { url: this.s3Service.getPublicUrl(dto.key) };
  }

  @Get('signed-url')
  @ApiOperation({ summary: 'Получить подписанный URL с ограниченным временем' })
  @ApiResponse({ status: 200, type: GetUrlResponseDto })
  async getSignedUrl(
    @Query() dto: GetSignedUrlDto,
  ): Promise<GetUrlResponseDto> {
    const url = await this.s3Service.getSignedUrl(
      dto.key,
      dto.expiresIn ?? 3600,
    );
    return { url };
  }

  @Get('exists')
  @ApiOperation({ summary: 'Проверить существование файла' })
  @ApiResponse({ status: 200, type: FileExistsResponseDto })
  async checkFileExists(
    @Query() dto: GetUrlDto,
  ): Promise<FileExistsResponseDto> {
    const exists = await this.s3Service.checkFileExists(dto.key);
    return { key: dto.key, exists };
  }
}
