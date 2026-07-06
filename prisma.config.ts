import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Prisma 7: the Prisma CLI (migrate, db push, studio) uses this single
  // `datasource.url` for everything it does — this replaces the old
  // `directUrl` concept. Migrations need a direct (non-pgbouncer) connection,
  // so this points at DIRECT_URL, not the pooled DATABASE_URL.
  datasource: {
    url: env('DIRECT_URL'),
  },
});