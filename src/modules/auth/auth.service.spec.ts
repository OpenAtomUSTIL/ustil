import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppConfig, configuration } from '../../config/configuration';
import { Role } from '../../common/decorators/roles.decorator';
import { REDIS_CLIENT, REFRESH_TOKEN_STORE } from '../../db/redis';
import { UserStatus } from '../../db/schema';
import { UsersService } from '../users/users.service';
import { UserSelf } from '../users/users.views';
import { AuthService } from './auth.service';
import { hashPassword } from './password';

const testConfig: AppConfig = {
  nodeEnv: 'test',
  port: 3000,
  corsOrigin: 'http://localhost:5173',
  databaseUrl: 'postgres://test',
  redisUrl: 'redis://test',
  jwtAccessSecret: 'test-access-secret-0123456789',
  jwtRefreshSecret: 'test-refresh-secret-0123456789',
  storage: {
    driver: 'local',
    localDir: './storage',
    r2: {
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
      bucket: '',
      publicBaseUrl: '',
    },
  },
  uploadMaxSize: 10485760,
};

const selfFixture: UserSelf = {
  id: '01890a5d-ac96-7000-8000-000000000001',
  nickname: '测试用户',
  avatarUrl: null,
  role: Role.MEMBER,
  status: UserStatus.ACTIVE,
  email: 'a@example.com',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const usersService = {
    createUser: jest.fn(),
    findByIdentifier: jest.fn(),
    getAuthRecordById: jest.fn(),
    updatePasswordHash: jest.fn(),
    getSelf: jest.fn(),
    getAuthUser: jest.fn(),
  };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    scan: jest.fn(),
  };
  const refreshStore = {
    register: jest.fn(),
    has: jest.fn(),
    revoke: jest.fn(),
    revokeAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: new JwtService({ secret: 'unit-test-secret' }) },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: REFRESH_TOKEN_STORE, useValue: refreshStore },
        { provide: configuration.KEY, useValue: testConfig },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  it('注册成功：邮箱标识落库并签发双 token', async () => {
    usersService.createUser.mockResolvedValue(selfFixture);

    const result = await service.register({
      identifier: 'A@Example.com',
      password: 'password123',
      nickname: '测试用户',
    });

    expect(usersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@example.com', phone: null }),
    );
    expect(result.user.id).toBe(selfFixture.id);
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    expect(refreshStore.register).toHaveBeenCalledWith(
      selfFixture.id,
      expect.any(String),
      7 * 24 * 3600,
    );
  });

  it('登录失败（密码错误）：统一返回“账号或密码错误”', async () => {
    usersService.findByIdentifier.mockResolvedValue({
      id: selfFixture.id,
      email: 'a@example.com',
      phone: null,
      passwordHash: await hashPassword('password123'),
      nickname: '测试用户',
      avatarUrl: null,
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    redis.get.mockResolvedValue('0');
    redis.incr.mockResolvedValue(1);
    redis.expire.mockResolvedValue(1);

    await expect(
      service.login({ identifier: 'a@example.com', password: 'wrong-password' }, '127.0.0.1'),
    ).rejects.toThrow('账号或密码错误');
    await expect(
      service.login({ identifier: 'a@example.com', password: 'wrong-password' }, '127.0.0.1'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('登录限流：15 分钟内失败 5 次后返回 429', async () => {
    redis.get.mockResolvedValue('5');

    await expect(
      service.login({ identifier: 'a@example.com', password: 'whatever' }, '127.0.0.1'),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it('refresh jti 复用：清空该用户全部 refresh 并拒绝', async () => {
    const token = jwtService.sign(
      { sub: selfFixture.id, jti: 'jti-old' },
      { secret: testConfig.jwtRefreshSecret, expiresIn: 60 },
    );
    refreshStore.has.mockResolvedValue(false);

    await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    expect(refreshStore.revokeAll).toHaveBeenCalledWith(selfFixture.id);
    expect(refreshStore.register).not.toHaveBeenCalled();
  });

  it('改密码：当前密码错误返回 400', async () => {
    usersService.getAuthRecordById.mockResolvedValue({
      id: selfFixture.id,
      email: 'a@example.com',
      phone: null,
      passwordHash: await hashPassword('password123'),
      nickname: '测试用户',
      avatarUrl: null,
      role: Role.MEMBER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.changePassword(selfFixture.id, {
        currentPassword: 'wrong-password',
        newPassword: 'newpassword123',
      }),
    ).rejects.toThrow(HttpException);
  });
});
