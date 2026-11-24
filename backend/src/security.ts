
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';

import { config } from './config';

export type Claims = {
  sub: string;
  estateId: string;
  role: 'ADMIN' | 'RESIDENT' | 'SECURITY';
  sid: string;
};

export const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

export const verifyPassword = (
  hash: string,
  password: string,
) => argon2.verify(hash, password);

export function accessToken(claims: Claims) {
  return jwt.sign(
    claims,
    config.JWT_ACCESS_SECRET,
    {
      expiresIn: `${config.ACCESS_TOKEN_MINUTES}m`,
      issuer: 'estate-visitor-api',
      audience: 'estate-mobile',
    },
  );
}

export function verifyAccess(token: string) {
  return jwt.verify(
    token,
    config.JWT_ACCESS_SECRET,
    {
      issuer: 'estate-visitor-api',
      audience: 'estate-mobile',
    },
  ) as Claims;
}

export function opaqueToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function tokenHash(token: string) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export function randomId() {
  return crypto.randomUUID();
}
