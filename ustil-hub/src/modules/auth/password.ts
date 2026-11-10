import { hash, verify, argon2id, type HashOptions } from 'argon2';

// Argon2id 参数固定（AGENTS.md §11.1）
const ARGON2_OPTIONS: HashOptions = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  return verify(digest, plain);
}
