import { config } from 'dotenv';
import { defineConfig } from '@prisma/config';

config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "npx tsx prisma/seed-admin.ts",
  },
});