import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { AuthService } from '../services/auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../types/jwt-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    // Accept token from body or cookie (optional)
    const token =
      dto.refreshToken ??
      (typeof req.cookies?.refreshToken === 'string' ? req.cookies.refreshToken : undefined);
    return this.auth.refresh({ refreshToken: token });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.userId);
  }
}

