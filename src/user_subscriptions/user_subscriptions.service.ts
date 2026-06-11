import { Injectable } from '@nestjs/common';
import { CreateUserSubscriptionDto } from './dto/create-user_subscription.dto';
import { UpdateUserSubscriptionDto } from './dto/update-user_subscription.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserSubscription } from './entities/user_subscription.entity';
import { Repository } from 'typeorm';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { User } from 'src/users/entities/user.entity';
import conflicts from 'src/utils/conflicts';
import { ISuccess } from 'src/interface/success.response';
import { emit } from 'process';

@Injectable()
export class UserSubscriptionsService {
  constructor(
    @InjectRepository(UserSubscription)
    private readonly userSubRepo: Repository<UserSubscription>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) { }

  async buySubscription(
    createSubscriptionDto: CreateUserSubscriptionDto,
    userId: number,
  ): Promise<ISuccess> {
    const { subscription_id } = createSubscriptionDto;

    const subscription = (await conflicts.mustExist(
      { id: subscription_id },
      this.subRepo,
      'Subscription',
      'id',
    )) as Subscription;

    const user = (await this.userRepo.findOne({
      where: { id: userId },
    })) as User;

    const activeSubscription = await this.userSubRepo.findOne({
      where: { user: { id: userId }, is_active: true },
      relations: { subscription: true },
    });

    const baseDate = activeSubscription
      ? new Date(activeSubscription.end_date)
      : new Date();

    const end_date = new Date(baseDate);
    end_date.setDate(end_date.getDate() + subscription.period);

    if (activeSubscription) {
      await this.userSubRepo.update(
        { id: activeSubscription?.id },
        {
          is_active: false,
        },
      );
    }

    const newSubscription = this.userSubRepo.create({
      issued_date: new Date(),
      is_active: true,
      subscription,
      user,
      end_date,
    });

    await this.userSubRepo.save(newSubscription);

    return {
      statusCode: 200,
      message: 'You have bought subscription, congratulation',
      data: {
        user: {
          full_name: user.full_name,
          email: user.email,
        },
        subscription: {
          name: subscription.name,
          period: subscription.period,
        },
      },
    };
  }

  async getAllSubscriptions(userId: number): Promise<ISuccess> {
    const subcriptions = await this.userSubRepo.find({
      where: { user: { id: userId } },
      relations: {
        subscription: true,
      },
      order: { issued_date: 'DESC' },
    });
    let end_date: string | Date = 'You have no valid subscription';
    let remaining_days: number = 0;

    if (subcriptions.length > 0) {
      const active_subscriptions = subcriptions.filter(
        (s) => s.is_active === true,
      );
      if (active_subscriptions.length > 0) {
        end_date = active_subscriptions[0].end_date;
      }
    }
    if (end_date instanceof Date) {
      remaining_days = Math.ceil(
        (end_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );
    }
    return {
      statusCode: 200,
      message: 'Your subscription history',
      data: {
        subcriptions,
        latest_subscription_end_date: end_date,
        remaining_days,
      },
    };
  }

  async getAllSubscriptedUsers(): Promise<ISuccess> {
    let users = await this.userRepo.find({
      where: { subscriptions: { is_active: true } },
      relations: {
        role: true,
        subscriptions : true
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        subscriptions: {
          is_active: true,
          issued_date: true,
          end_date: true
        }
      }
    })

    return {
      statusCode: 200,
      message: "All subscripted users",
      data: users
    }
  }
}
