import { PartialType } from '@nestjs/swagger';
import { CreateVideoQualityDto } from './create-video-quality.dto';

export class UpdateVideoQualityDto extends PartialType(CreateVideoQualityDto) {}




