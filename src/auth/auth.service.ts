import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth-dto';
import conflicts from 'src/utils/conflicts';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from 'src/roles/entities/role.entity';
import { Crypto } from 'src/utils/Crypto';
import { PendingUser } from './entities/pending.user.entity';
import { generateOtp } from 'src/utils/generate-otp';
import { sendMail } from 'src/utils/mail-service';
import { ISuccess } from 'src/interface/success.response';
import { ConfirmOtpDto } from './dto/confirm-otp-dto';
import { SigninAuthDto } from './dto/signin-auth-dto';
import { Token } from 'src/utils/Token';
import e, { Request, Response } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password-dto';
import { Cache } from 'src/utils/cache.control';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { ProcessingUser } from './entities/processing.user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(PendingUser)
    private readonly penUserRepo: Repository<PendingUser>,
    @InjectRepository(ProcessingUser)
    private readonly proUserRepo: Repository<ProcessingUser>,
    private readonly Token: Token,
    private readonly Cache: Cache,
  ) { }
  async login(loginAuthDto: LoginAuthDto, roleId: number): Promise<ISuccess> {
    const { email, login, password, repeat_password } = loginAuthDto;
    await conflicts.mustBeUnique({ email }, this.userRepo, 'User', 'email');

    await conflicts.mustBeUnique({ login }, this.userRepo, 'User', 'login');

    const role = (await this.roleRepo.findOne({
      where: { id: roleId },
    })) as Role;

    if (password !== repeat_password) {
      throw new ConflictException(`Password did not match`);
    }

    const hashedPassword = await Crypto.hash(password);
    loginAuthDto.password = hashedPassword;

    const otp = generateOtp();
    const sms = await sendMail(email, otp);

    const penUser = this.penUserRepo.create({
      ...loginAuthDto,
      role,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await this.penUserRepo.save(penUser);

    return {
      statusCode: 200,
      message: 'OTP has been sent to your email',
      data: {},
    };
  }

  async confirmOtp(confirmOtpDto: ConfirmOtpDto): Promise<ISuccess> {
    const { email, otp } = confirmOtpDto
    await conflicts.mustExist({ email }, this.penUserRepo, 'User', 'email')

    const penUser = (await this.penUserRepo.findOne({
      where: { email },
      relations: { role: true },
    })) as PendingUser;

    if (otp !== penUser.otp) {
      throw new BadRequestException(
        `OTP is incorrect or expired, please register again`,
      );
    }

    const newUser = this.userRepo.create({
      full_name: penUser.full_name,
      email: penUser.email,
      login: penUser.login,
      password: penUser.password,
      role: penUser.role,
    });

    await this.userRepo.save(newUser);
    const { password: pass, ...data } = newUser;
    await this.penUserRepo.delete(penUser.id);
    return {
      statusCode: 201,
      message: "You've been registered, successfully",
      data,
    };
  }

  async signIn(res: Response, singInDto: SigninAuthDto): Promise<ISuccess> {
    const { login, password } = singInDto;

    const user = await this.userRepo.findOne({
      where: { login },
      relations: { role: true }
    }) as User;

    if (!user) {
      res.clearCookie("refreshToken")
      throw new BadRequestException(`Login or Password is wrong`);
    }
    const isMatch = await Crypto.compare(password, user?.password);

    if (!isMatch) {
      res.clearCookie("refreshToken")
      throw new BadRequestException(`Login or Password is wrong`);
    }

    const payload = {
      id: user?.id,
      full_name: user?.full_name,
      role: user?.role,
    };

    const aToken = this.Token.getAccessToken(payload);
    const rToken = this.Token.getRefreshToken(res, payload);

    return {
      statusCode: 200,
      message: "You've signed in successfully",
      data: {
        access_token: aToken,
        refresh_token: rToken,
      },
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ISuccess> {
    const { email } = forgotPasswordDto;
    await conflicts.mustExist({ email }, this.userRepo, 'User', 'email');
    const otp = generateOtp();

    await sendMail(email, otp);
    const newProUser = this.proUserRepo.create({
      email,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });

    await this.proUserRepo.save(newProUser);

    return {
      statusCode: 200,
      message: 'OTP has been sent to your email',
      data: {},
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ISuccess> {
    const { otp, new_password, repeat_password, email, new_login } =
      resetPasswordDto;
    const user = (await this.userRepo.findOne({
      where: { email },
    })) as User;
    if (!user) {
      throw new NotFoundException(`User with this email does not exist`);
    }

    const proUser = await this.proUserRepo.findOne({ where: { email } });

    if (!proUser || proUser.otp !== otp) {
      throw new BadRequestException(`OTP is incorrect or expired`);
    }

    await conflicts.mustBeUnique({ login: new_login }, this.userRepo, 'User', 'login');
    if (new_password !== repeat_password) {
      throw new BadRequestException(`Password did not match`);
    }

    const hashedPassword = await Crypto.hash(new_password);

    await this.userRepo.update(
      { email },
      {
        password: hashedPassword,
        login: new_login,
      },
    );

    await this.proUserRepo.delete({ email });
    return {
      statusCode: 200,
      message: 'Password and Login has been reset successfully',
      data: {},
    };
  }

  async getAccessToken(@Req() req): Promise<ISuccess> {
    let refreshToken = req?.cookies.refreshToken

    if (!refreshToken) {
      throw new UnauthorizedException(`Please sign in first`)
    }
    let data = this.Token.verifyRefreshToken(refreshToken) as User
    if (!data) {
      throw new UnauthorizedException(`Something went wrong, please sign in again`)
    }

    let user = await this.userRepo.findOne({
      where: { id: data?.id },
      relations: { role: true }
    })

    if (!user) {
      throw new NotFoundException(`Your data is not found, please register again`)
    }

    let payload = {
      id: user?.id,
      full_name: user?.full_name,
      role: user?.role,
    };

    let aToken = this.Token.getAccessToken(payload)

    return {
      statusCode: 200,
      message: 'access token',
      data: {
        access_token: aToken
      }
    }
  }
}
