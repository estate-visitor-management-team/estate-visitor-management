import 'dotenv/config';

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum([
    'development',
    'test',
    'production',
  ]).default('development'),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  ACCESS_TOKEN_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(14),

  CORS_ORIGINS: z.string().default(''),

  EXPO_ACCESS_TOKEN: z.string().optional(),
});

export const config = schema.parse(process.env);