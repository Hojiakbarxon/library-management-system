import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PendingUser } from './entities/pending.user.entity';
import { LessThan, Repository } from 'typeorm';
import { ProcessingUser } from './entities/processing.user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserSubscription } from 'src/user_subscriptions/entities/user_subscription.entity';

@Injectable()
export class TasksSerive {
  constructor(
    @InjectRepository(PendingUser)
    private readonly penUser: Repository<PendingUser>,
    @InjectRepository(ProcessingUser)
    private readonly proUser: Repository<ProcessingUser>,
    @InjectRepository(UserSubscription)
    private readonly userSubRepo: Repository<UserSubscription>,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async cleanPendingUser(): Promise<boolean> {
    const result = await this.penUser.delete({
      expires_at: LessThan(new Date()),
    });

    return true;
  }

  @Cron(CronExpression.EVERY_SECOND)
  async cleanProUser(): Promise<boolean> {
    const result = await this.proUser.delete({
      expires_at: LessThan(new Date()),
    });

    return true;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkSubscriptionAvailability(): Promise<boolean> {
    const result = await this.userSubRepo.update(
      {
        end_date: LessThan(new Date()),
      },
      {
        is_active: false,
      },
    );

    return true;
  }
}
