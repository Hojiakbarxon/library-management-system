import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsOptional()
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
