import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BooksModule } from './books/books.module';
import { AuthorsModule } from './authors/authors.module';
import { GenresModule } from './genres/genres.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RequestsModule } from './requests/requests.module';
import { UserBooksModule } from './user-books/user-books.module';
import { ConfigModule } from '@nestjs/config';
import { envConfig } from './config/env.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { Author } from './authors/entities/author.entity';
import { Genre } from './genres/entities/genre.entity';
import { Book } from './books/entities/book.entity';
import { Subscription } from './subscriptions/entities/subscription.entity';
import { PendingUser } from './auth/entities/pending.user.entity';
import { ProcessingUser } from './auth/entities/processing.user.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { UserSubscriptionsModule } from './user_subscriptions/user_subscriptions.module';
import { UserSubscription } from './user_subscriptions/entities/user_subscription.entity';
import { Status } from './statuses/status.entity';
import { Request } from './requests/entities/request.entity';
import { UserBook } from './user-books/entities/user-book.entity';
import { APP_FILTER } from '@nestjs/core';
import { GlobalFilter } from './common/filters/global/global.filter';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logger/winston.config';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    WinstonModule.forRoot(winstonConfig),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: envConfig.db_url,
      synchronize: true,
      entities: [
        Role,
        User,
        Author,
        Genre,
        Book,
        Subscription,
        PendingUser,
        ProcessingUser,
        UserSubscription,
        Status,
        Request,
        UserBook,
      ],
    }),
    AuthModule,
    UsersModule,
    BooksModule,
    AuthorsModule,
    GenresModule,
    SubscriptionsModule,
    RequestsModule,
    UserBooksModule,
    UserSubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalFilter
    }
  ],
})
export class AppModule { }
