import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserBookDto } from './dto/create-user-book.dto';
import { UpdateUserBookDto } from './dto/update-user-book.dto';
import { ISuccess } from 'src/interface/success.response';
import { InjectRepository } from '@nestjs/typeorm';
import { UserBook } from './entities/user-book.entity';
import { Repository } from 'typeorm';
import { toUSVString } from 'util';
import { User } from 'src/users/entities/user.entity';
import { Book } from 'src/books/entities/book.entity';
import { Request } from 'src/requests/entities/request.entity';

@Injectable()
export class UserBooksService {
  constructor(
    @InjectRepository(UserBook)
    private readonly userBookRepo: Repository<UserBook>,
    @InjectRepository(Request) private readonly reqRepo: Repository<Request>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
  ) {}

  async findAll(): Promise<ISuccess> {
    const userBooks = await this.userBookRepo.find({
      relations: {
        user: true,
        book: true,
        request: true,
      },
      select: {
        id: true,
        borrowed_at: true,
        is_active: true,
        returned_at: true,
        user: {
          id: true,
          full_name: true,
          email: true,
        },
        book: {
          id: true,
          name: true,
        },
        request: {
          id: true,
        },
      },
      order: {
        is_active: 'ASC',
      },
    });

    return {
      statusCode: 200,
      message: 'All borrowed books',
      data: userBooks,
    };
  }

  async getMyBooks(userId: number): Promise<ISuccess> {
    const userBook = await this.userBookRepo.find({
      where: { user: { id: userId } },
      relations: {
        book: true,
      },
      select: {
        id: true,
        borrowed_at: true,
        is_active: true,
        returned_at: true,
        book: {
          id: true,
          name: true,
          cover_image : true,
        },
      },
    });
    if (userBook.length === 0) {
      throw new NotFoundException(`You have no borrowed books`);
    }

    return {
      statusCode: 200,
      message: 'Your borrowed books',
      data: userBook,
    };
  }
}
