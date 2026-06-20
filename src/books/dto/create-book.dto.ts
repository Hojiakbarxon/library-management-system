import { Optional } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @Optional()
  book_details?: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  author_id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  genre_id: number;
}
