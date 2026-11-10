import { defineConfig } from 'drizzle-kit';

// drizzle-kit generate 不连接数据库；migrate 时需提供真实 DATABASE_URL
const url = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/ustil';

export default defineConfig({
  schema: './src/db/schema',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
});
