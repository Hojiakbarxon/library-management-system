import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth-dto';
import { ConfirmOtpDto } from './dto/confirm-otp-dto';
import { SigninAuthDto } from './dto/signin-auth-dto';
import express from 'express';
import { ForgotPasswordDto } from './dto/forgot-password-dto';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { ResendOtpDto } from './dto/resend-otp-dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.login(loginAuthDto, 3);
  }

  @Post("resend-otp")
  resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto)
  }
  @Post('confirm-otp')
  confirmOtp(@Body() confirmOtpDto: ConfirmOtpDto) {
    return this.authService.confirmOtp(confirmOtpDto);
  }

  @Post('sign-in')
  signIn(
    @Res({ passthrough: true }) res: express.Response,
    @Body() singInDto: SigninAuthDto,
  ) {
    return this.authService.signIn(res, singInDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('get-access-token')
  getAccessToken(@Req() req) {
    return this.authService.getAccessToken(req)
  }
}
