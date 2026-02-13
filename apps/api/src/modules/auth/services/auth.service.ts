import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

function nowPlusSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

@Injectable()
export class AuthService {
  private readonly jwt = new JwtService();

  constructor(private readonly prisma: PrismaService) {}

  private accessTtlSeconds() {
    return Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);
  }

  private refreshTtlSeconds() {
    return Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 60 * 60 * 24 * 30);
  }

  private signAccessToken(userId: string) {
    const secret = process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret';
    return this.jwt.sign(
      { sub: userId },
      { secret, expiresIn: this.accessTtlSeconds() },
    );
  }

  private signRefreshToken(userId: string) {
    const secret = process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret';
    return this.jwt.sign(
      { sub: userId, typ: 'refresh' },
      { secret, expiresIn: this.refreshTtlSeconds() },
    );
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BadRequestException('Email ya registrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        phone: dto.phone,
      },
    });

    if (dto.createCenter) {
      const name = dto.centerName?.trim() || `${dto.name} Center`;
      const slugBase = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const slug = `${slugBase}-${user.id.slice(0, 6)}`;
      const center = await this.prisma.center.create({
        data: { name, slug },
      });
      await this.prisma.centerUser.create({
        data: { centerId: center.id, userId: user.id, role: 'OWNER' },
      });
    }

    const accessToken = this.signAccessToken(user.id);
    const refreshToken = this.signRefreshToken(user.id);
    const refreshHash = await bcrypt.hash(refreshToken, 12);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: nowPlusSeconds(this.refreshTtlSeconds()),
      },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const accessToken = this.signAccessToken(user.id);
    const refreshToken = this.signRefreshToken(user.id);
    const refreshHash = await bcrypt.hash(refreshToken, 12);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: nowPlusSeconds(this.refreshTtlSeconds()),
      },
    });

    const centers = await this.prisma.centerUser.findMany({
      where: { userId: user.id },
      include: { center: true },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
      centers: centers.map((cu: { center: { id: string; name: string; slug: string }; role: string }) => ({
        id: cu.center.id,
        name: cu.center.name,
        slug: cu.center.slug,
        role: cu.role,
      })),
      accessToken,
      refreshToken,
    };
  }

  async refresh(input: { refreshToken?: string }) {
    const token = input.refreshToken;
    if (!token) throw new UnauthorizedException('Refresh token requerido');

    const secret = process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret';
    let payload: any;
    try {
      payload = this.jwt.verify(token, { secret });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (payload.typ !== 'refresh') throw new UnauthorizedException('Refresh token inválido');
    const userId = String(payload.sub);

    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const match = await (async () => {
      for (const t of tokens) {
        if (await bcrypt.compare(token, t.tokenHash)) return t;
      }
      return null;
    })();

    if (!match) throw new UnauthorizedException('Refresh token inválido o revocado');

    const accessToken = this.signAccessToken(userId);
    const newRefreshToken = this.signRefreshToken(userId);
    const newRefreshHash = await bcrypt.hash(newRefreshToken, 12);

    await this.prisma.refreshToken.update({
      where: { id: match.id },
      data: { revokedAt: new Date() },
    });
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: newRefreshHash,
        expiresAt: nowPlusSeconds(this.refreshTtlSeconds()),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException();

    const centers = await this.prisma.centerUser.findMany({
      where: { userId },
      include: { center: true },
    });

    return {
      user,
      centers: centers.map((cu: { center: { id: string; name: string; slug: string }; role: string }) => ({
        id: cu.center.id,
        name: cu.center.name,
        slug: cu.center.slug,
        role: cu.role,
      })),
    };
  }
}
