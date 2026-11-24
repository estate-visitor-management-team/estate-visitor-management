"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const schema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum([
        'development',
        'test',
        'production',
    ]).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    ACCESS_TOKEN_MINUTES: zod_1.z.coerce.number().default(15),
    REFRESH_TOKEN_DAYS: zod_1.z.coerce.number().default(14),
    CORS_ORIGINS: zod_1.z.string().default(''),
    EXPO_ACCESS_TOKEN: zod_1.z.string().optional(),
});
exports.config = schema.parse(process.env);
