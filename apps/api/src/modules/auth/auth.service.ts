import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Optional,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';
import { UserRepository } from '../../repositories/user/user.repository';
import { RefreshSessionRepository } from '../../repositories/refresh-session/refresh-session.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: Omit<User, 'passwordHash'>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly inMemoryLocks = new Map<string, boolean>();
  private readonly recentTokensCache = new Map<
    string,
    { tokens: AuthTokens; expiresAt: number }
  >();

  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() private readonly prismaService?: PrismaService,
  ) {}

  private async getCachedRefreshSession(userId: string) {
    return this.refreshSessionRepository.findByUserId(userId);
  }

  private async invalidateRefreshSessionCache(userId: string): Promise<void> {
    // Session invalidated from DB
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const isTest = process.env.NODE_ENV === 'test';
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: isTest ? 4096 : 65536,
      timeCost: isTest ? 1 : 3,
    });

    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      isEmailVerified: true,
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    const { passwordHash: _, ...sanitizedUser } = user;
    return {
      ...tokens,
      user: sanitizedUser,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    const { passwordHash: _, ...sanitizedUser } = user;
    return {
      ...tokens,
      user: sanitizedUser,
    };
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    let payload: { sub: string; email?: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const userId = payload.sub;

    const memoryRecent = this.recentTokensCache.get(userId);
    if (memoryRecent && memoryRecent.expiresAt > Date.now()) {
      return memoryRecent.tokens;
    }

    let attempts = 0;
    while (this.inMemoryLocks.get(userId) && attempts < 40) {
      const memoryRecentWhileWaiting = this.recentTokensCache.get(userId);
      if (
        memoryRecentWhileWaiting &&
        memoryRecentWhileWaiting.expiresAt > Date.now()
      ) {
        return memoryRecentWhileWaiting.tokens;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts++;
    }

    if (this.inMemoryLocks.get(userId)) {
      throw new UnauthorizedException(
        'Refresh lock timeout: concurrent request in progress',
      );
    }
    this.inMemoryLocks.set(userId, true);

    try {
      const session = await this.getCachedRefreshSession(userId);
      if (!session) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const isTokenValid = await argon2.verify(
        session.tokenHash,
        dto.refreshToken,
      );
      if (!isTokenValid) {
        const memoryRecent = this.recentTokensCache.get(userId);
        if (memoryRecent && memoryRecent.expiresAt > Date.now()) {
          return memoryRecent.tokens;
        }

        await this.refreshSessionRepository.deleteByUserId(userId);
        await this.invalidateRefreshSessionCache(userId);
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user.id, user.email);
      await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

      this.recentTokensCache.set(userId, {
        tokens,
        expiresAt: Date.now() + 10000,
      });

      return tokens;
    } finally {
      this.inMemoryLocks.delete(userId);
    }
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.refreshSessionRepository.deleteByUserId(userId);
    await this.invalidateRefreshSessionCache(userId);
    this.recentTokensCache.delete(userId);
    return { success: true };
  }

  async getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const { passwordHash: _, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const accessSecret =
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: accessSecret, expiresIn: '7d' },
      ),
      this.jwtService.signAsync(
        { sub: userId },
        { secret: refreshSecret, expiresIn: '30d' },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    await this.refreshSessionRepository.deleteByUserId(userId);
    await this.invalidateRefreshSessionCache(userId);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshSessionRepository.create({
      userId,
      tokenHash,
      expiresAt,
    });
  }
}
