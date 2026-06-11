import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserSubscriptionsService } from './user_subscriptions.service';
import { CreateUserSubscriptionDto } from './dto/create-user_subscription.dto';
import { UpdateUserSubscriptionDto } from './dto/update-user_subscription.dto';
import { Request } from 'express';
import { PassThrough } from 'stream';
import { AuthGuard } from 'src/auth/auth.guard';
import { RoleGuard } from 'src/role/role.guard';
import { Roles } from 'src/Decorators/role.decorator';
import { Role } from 'src/config/role-enum';

@UseGuards(AuthGuard, RoleGuard)
@Controller('user-subscriptions')
export class UserSubscriptionsController {
  constructor(
    private readonly userSubscriptionsService: UserSubscriptionsService,
  ) { }

  @Post('buy-subscription')
  buySubscription(
    @Body() createSubscriptionDto: CreateUserSubscriptionDto,
    @Req() req,
  ) {
    return this.userSubscriptionsService.buySubscription(
      createSubscriptionDto,
      req.user.id,
    );
  }

  @Get('my-history')
  getAllSubscriptions(@Req() req) {
    return this.userSubscriptionsService.getAllSubscriptions(+req.user.id);
  }

  @Get('subscripted-user')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  getSubscriptedUsers() {
    return this.userSubscriptionsService.getAllSubscriptedUsers()
  }

}
