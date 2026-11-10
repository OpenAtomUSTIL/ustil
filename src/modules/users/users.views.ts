import { Role } from '../../common/decorators/roles.decorator';
import { UserStatus } from '../../db/schema/users';

export interface UserSelf {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  role: Role;
}

export interface UserAuthRecord {
  id: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  nickname: string;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  role: Role;
  status: UserStatus;
}
