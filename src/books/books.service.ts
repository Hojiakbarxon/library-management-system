import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Repository } from 'typeorm';
import { Author } from 'src/authors/entities/author.entity';
import { Genre } from 'src/genres/entities/genre.entity';
import { ISuccess } from 'src/interface/success.response';
import conflicts from 'src/utils/conflicts';
import { join } from 'path';
import { unlink } from 'fs/promises';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
    @InjectRepository(Author) private readonly authorRepo: Repository<Author>,
    @InjectRepository(Genre) private readonly genreRepo: Repository<Genre>,
  ) { }

  async create(
    createBookDto: CreateBookDto,
    cover_image: Express.Multer.File,
  ): Promise<ISuccess> {
    const { author_id, genre_id } = createBookDto;
    if (!cover_image) {
      throw new BadRequestException(`Image is required`);
    }
    const author = await conflicts.mustExist(
      { id: author_id },
      this.authorRepo,
      'Author',
      'id',
    );
    const genre = await conflicts.mustExist(
      { id: genre_id },
      this.genreRepo,
      'Genre',
      'id',
    );

    const imagePath = `uploads/book_photos/${cover_image.filename}`;

    const newBook = this.bookRepo.create({
      ...createBookDto,
      cover_image: imagePath,
      author,
      genre,
    });
    await this.bookRepo.save(newBook);

    return {
      statusCode: 201,
      message: 'book created successfully',
      data: newBook,
    };
  }

  async findAll(): Promise<ISuccess> {
    const books = await this.bookRepo.find({
      relations: {
        author: true,
        genre: true,
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        cover_image: true,
        author: true,
        genre: true
      }
    });

    return {
      statusCode: 200,
      message: 'success',
      data: books,
    };
  }

  async findOne(id: number): Promise<ISuccess> {
    await conflicts.mustExist({ id }, this.bookRepo, 'Book', 'id');
    const book = (await this.bookRepo.findOne({
      where: { id },
      relations: {
        author: true,
        genre: true,
      },
    })) as Book;

    return {
      statusCode: 200,
      message: 'success',
      data: book,
    };
  }

  async update(
    id: number,
    updateBookDto: UpdateBookDto,
    cover_image: Express.Multer.File,
  ): Promise<ISuccess> {
    const { author_id, genre_id, name, quantity, book_details } = updateBookDto;
    const book = (await conflicts.mustExist(
      { id },
      this.bookRepo,
      'Book',
      'id',
    )) as Book;
    const updateDate: Partial<Book> = {};

    if (name) {
      await conflicts.mustBeUniqueOnUpdate(
        id,
        { name },
        this.bookRepo,
        'Book',
        'name',
      );
      updateDate.name = name;
    }

    if (quantity) {
      updateDate.quantity = quantity;
    }

    if (author_id) {
      const author = (await conflicts.mustExist(
        { id: author_id },
        this.authorRepo,
        'Author',
        'id',
      )) as Author;
      updateDate.author = author;
    }

    if (genre_id) {
      const genre = (await conflicts.mustExist(
        { id: genre_id },
        this.genreRepo,
        'Genre',
        'id',
      )) as Genre;
      updateDate.genre = genre;
    }

    if (cover_image) {
      if (book.cover_image) {
        const oldImagePath = join(process.cwd(), book.cover_image);
        try {
          await unlink(oldImagePath);
        } catch (error) {
          console.log(error);
        }

        updateDate.cover_image = `uploads/book_photos/${cover_image.filename}`;
      }
    }

    if (book_details) {
      updateDate.book_details = book_details;
    };

    await this.bookRepo.update(id, updateDate);

    return this.findOne(id);
  }

  async remove(id: number): Promise<ISuccess> {
    const book = (await conflicts.mustExist(
      { id },
      this.bookRepo,
      'Book',
      'id',
    )) as Book;
    if (book.cover_image) {
      const oldPath = join(process.cwd(), book.cover_image);
      try {
        await unlink(oldPath);
      } catch (error) {
        console.log(error);
      }
    }

    await this.bookRepo.delete(id);

    return {
      statusCode: 200,
      message: 'Book deleted, successfully',
      data: {},
    };
  }
}
