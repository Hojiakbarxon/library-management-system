import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRequestDto } from './dto/create-request.dto';
import { ISuccess } from 'src/interface/success.response';
import { Repository } from 'typeorm';
import { Request } from './entities/request.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from 'src/books/entities/book.entity';
import { User } from 'src/users/entities/user.entity';
import conflicts from 'src/utils/conflicts';
import { Status } from 'src/statuses/status.entity';
import { UserBook } from 'src/user-books/entities/user-book.entity';
import { Purpose } from 'src/config/purpose-enum';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request) private readonly reqRepo: Repository<Request>,
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Status) private readonly statusRepo: Repository<Status>,
    @InjectRepository(UserBook)
    private readonly userBookRepo: Repository<UserBook>,
  ) {}
  async create(
    createRequestDto: CreateRequestDto,
    userId: number,
  ): Promise<ISuccess> {
    const { books_ids } = createRequestDto;

    const user = (await this.userRepo.findOne({
      where: { id: userId },
      relations: { subscriptions: true },
    })) as User;

    const active_subscription = user.subscriptions.filter(
      (s) => s.is_active === true,
    );

    if (active_subscription.length === 0) {
      throw new ConflictException(
        `You have no subscription to request books, you can buy subscription and continue`,
      );
    }

    const pending_requests = await this.reqRepo.find({
      where: { user: { id: userId }, status: { id: 1 } },
    });

    if (pending_requests.length > 0) {
      throw new ConflictException(
        `You have pending request(s), please wait until your previous request is done`,
      );
    }

    for (const id of books_ids) {
      const book = (await conflicts.mustExist(
        { id },
        this.bookRepo,
        'Book',
        ` ${id} id`,
      )) as Book;
      if (book.quantity == 0) {
        throw new ConflictException(
          `The book ${book.name} is not available now, sorry`,
        );
      }
    }

    const status = (await this.statusRepo.findOneBy({ id: 1 })) as Status;

    const data: object[] = [];
    for (const id of books_ids) {
      const book = (await this.bookRepo.findOne({
        where: { id },
      })) as Book;

      const newRequest = this.reqRepo.create({
        book,
        status,
        user,
        purpose : Purpose.borrow
      });

      await this.reqRepo.save(newRequest);

      await this.bookRepo.update(
        { id: book.id },
        {
          quantity: book.quantity - 1,
        },
      );

      const returningData = {
        book,
        status: status.name,
      };
      data.push(returningData);
    }

    return {
      statusCode: 201,
      message: `Your request has been accepted`,
      data,
    };
  }

  async findAll(): Promise<ISuccess> {
    const requests = await this.reqRepo.find({
      relations: {
        user: true,
        book: true,
        status: true,
      },
      select: {
        id: true,
        user: {
          id: true,
          full_name: true,
          email: true,
        },
        book: {
          id: true,
          name: true,
        },
        status: {
          name: true,
        },
        purpose: true,
      },
      order: { status: { id: 'ASC' } },
    });

    return {
      statusCode: 200,
      message: 'All requests',
      data: requests,
    };
  }

  async findOne(id: number): Promise<ISuccess> {
    await conflicts.mustExist({ id }, this.reqRepo, 'Request', 'id');
    const request = (await this.reqRepo.findOne({
      where: { id },
      relations: {
        user: true,
        book: true,
        status: true,
      },
      select: {
        id: true,
        user: {
          id: true,
          full_name: true,
          email: true,
        },
        book: {
          id: true,
          name: true,
        },
        status: {
          name: true,
        },
        purpose: true,
      },
    })) as Request;

    return {
      statusCode: 200,
      message: 'Request',
      data: request,
    };
  }

  async getMyRequests(id: number): Promise<ISuccess> {
    const requests = await this.reqRepo.find({
      where: { user: { id } },
      relations: { book: true, status: true },
      select: {
        id: true,
        status: {
          name: true,
        },
        book: {
          name: true,
        },
        purpose: true,
      },
      order: {
        id: 'DESC',
      },
    });

    if (requests.length === 0) {
      throw new NotFoundException(`You have no requests yet`);
    }

    return {
      statusCode: 200,
      message: 'Your request history',
      data: requests,
    };
  }

  async getMyActiveRequests(id: number): Promise<ISuccess> {
    const requests = await this.reqRepo.find({
      where: { user: { id }, status: { id: 1 } },
      relations: { book: true, status: true },
      select: {
        id: true,
        status: {
          name: true,
        },
        book: {
          name: true,
        },
        purpose: true,
      },
    });

    if (requests.length === 0) {
      throw new NotFoundException(`You have no active(pending) requests`);
    }

    return {
      statusCode: 200,
      message: 'Your active(pending) requests',
      data: requests,
    };
  }

  async rejectRequest(id: number): Promise<ISuccess> {
    await conflicts.mustExist({ id }, this.reqRepo, 'Request', 'id');

    const request = (await this.reqRepo.findOne({
      where: { id, status: { id: 1 } },
      relations: {
        status: true,
        book: true,
      },
    })) as Request;

    if (!request) {
      throw new ConflictException(`You can only reject pending requests`);
    }

    if (request.purpose === Purpose.borrow) {
      await this.bookRepo.update(
        {
          id: request.book.id,
        },
        {
          quantity: request.book.quantity + 1,
        },
      );
    }

    await this.reqRepo.update(
      { id },
      {
        status: {
          id: 3,
        },
      },
    );

    return {
      statusCode: 200,
      message: 'Request rejected',
      data: {},
    };
  }

  async rejectMyRequest(id: number, userId: number): Promise<ISuccess> {
    await conflicts.mustExist({ id }, this.reqRepo, 'Request', 'id');
    const request = (await this.reqRepo.findOne({
      where: { id, user: { id: userId }, status: { id: 1 } },
      relations: {
        status: true,
        book: true,
      },
    })) as Request;

    if (!request) {
      throw new ConflictException(`You can only reject your pending requests`);
    }

    if (request.purpose === Purpose.borrow) {
      await this.bookRepo.update(
        {
          id: request.book.id,
        },
        {
          quantity: request.book.quantity + 1,
        },
      );
    }

    await this.reqRepo.update(
      { id },
      {
        status: {
          id: 3,
        },
      },
    );

    return {
      statusCode: 200,
      message: 'Request rejected',
      data: {},
    };
  }

  async requestReturn(userBookId: number, userId: number): Promise<ISuccess> {
    const userBook = await this.userBookRepo.findOne({
      where: { id: userBookId, user: { id: userId }, is_active: true },
      relations: { book: true, user: true },
    });

    if (!userBook) {
      throw new NotFoundException(`No active borrow found`);
    }

    const existing = await this.reqRepo.findOne({
      where: {
        userBook: { id: userBookId },
        purpose: Purpose.return,
        status: { id: 1 },
      },
    });

    if (existing) {
      throw new ConflictException(
        `You already have a pending return request for this book`,
      );
    }

    const pendingStatus = (await this.statusRepo.findOneBy({
      id: 1,
    })) as Status;

    const returnRequest = this.reqRepo.create({
      user: userBook.user,
      book: userBook.book,
      userBook,
      status: pendingStatus,
      purpose: Purpose.return,
    });
    await this.reqRepo.save(returnRequest);

    return {
      statusCode: 201,
      message: 'Return request submitted, waiting for  approval',
      data: {},
    };
  }

  async acceptRequest(id: number): Promise<ISuccess> {
    await conflicts.mustExist({ id }, this.reqRepo, 'Request', 'id');

    const request = (await this.reqRepo.findOne({
      where: { id, status: { id: 1 } },
      relations: {
        user: true,
        book: true,
        status: true,
        userBook: true,
      },
    })) as Request;

    if (!request) {
      throw new ConflictException(`You can only accept pending requests`);
    }

    await this.reqRepo.update(id, {
      status: {
        id: 2,
      },
    });

    if (request.purpose === Purpose.borrow) {
      const userBook = this.userBookRepo.create({
        user: request.user,
        book: request.book,
        request,
        is_active: true,
      });

      await this.userBookRepo.save(userBook);
    } else if (request.purpose === Purpose.return) {
      await this.userBookRepo.update(
        {
          id: request.userBook.id,
        },
        {
          is_active: false,
          returned_at: new Date(),
        },
      );

      await this.bookRepo.update(
        {
          id: request.book.id,
        },
        {
          quantity: request.book.quantity + 1,
        },
      );
    }

    return {
      statusCode: 200,
      message:
        request.purpose === Purpose.borrow
          ? `Request accepted, book issued to user`
          : `Request accepted, book restored to the library`,
      data: {},
    };
  }
}
