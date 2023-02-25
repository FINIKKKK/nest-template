import { Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common/enums';
import {
  HttpException,
  UnauthorizedException,
} from '@nestjs/common/exceptions';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from 'src/models/users/users.service';
import { UserDto } from 'src/models/users/dto/user.dto';
import { UserEntity } from 'src/models/users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginUserDto) {
    const user = await this.usersService.getUserByEmail(dto.email);
    const isTruePassword = user
      ? await bcrypt.compare(dto.password, user.password)
      : undefined;

    if (user && isTruePassword) {
      const { password, ...userData } = user;
      const token = await this.generateToken(user);
      return {
        ...userData,
        token,
      };
    }
    throw new UnauthorizedException({
      message: 'Неверный email или пароль',
    });
  }

  async register(dto: UserDto) {
    const findUserByName = await this.usersService.getUserByLogin(dto.login.toLocaleLowerCase());
    const findUserByEmail = await this.usersService.getUserByEmail(dto.email);
    if (findUserByName) {
      throw new HttpException(
        'Данный логин уже используется',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (findUserByEmail) {
      throw new HttpException(
        'Данный email уже используется',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashPassword = await bcrypt.hash(dto.password, 5);
    const user = await this.usersService.createUser({
      ...dto,
      password: hashPassword,
    });
    const { password, ...userData } = user;
    const token = await this.generateToken(user);
    return {
      ...userData,
      token,
    };
  }

  private async generateToken(user: UserEntity) {
    const payload = { id: user.id, name: user.login, email: user.email };
    return this.jwtService.sign(payload);
  }
}
