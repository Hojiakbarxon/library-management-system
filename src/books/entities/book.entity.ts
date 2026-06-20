import { Author } from 'src/authors/entities/author.entity';
import { Genre } from 'src/genres/entities/genre.entity';
import { Request } from 'src/requests/entities/request.entity';
import { UserBook } from 'src/user-books/entities/user-book.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('Book')
export class Book {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'smallint', nullable: false })
  quantity: number;

  @Column({ type: 'varchar', nullable: false })
  cover_image: string;

  @Column({ type: "text", nullable: true })
  book_details: string;

  @ManyToOne(() => Author, (author) => author.books)
  author: Author;

  @ManyToOne(() => Genre, (genre) => genre.books)
  genre: Genre;

  @OneToMany(() => Request, (rquest) => rquest.book)
  requests: Request[];

  @OneToMany(() => UserBook, (ubook) => ubook.book)
  userBooks: UserBook[];
}
