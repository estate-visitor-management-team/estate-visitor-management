import 'reflect-metadata';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { createServer } from 'node:http';
import { Server } from 'socket.io';

import { config } from './config';

import auth from './routes/auth';
import admin from './routes/admin';
import visitors from './routes/visitors';
import reports from './routes/reports';

import { pool } from './db';
import { authenticate } from './middleware/auth';

const app = express();
const http = createServer(app);

const origins = config.CORS_ORIGINS
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

const io = new Server(http, {
  cors: {
    origin: config.NODE_ENV === 'development'
      ? true
      : origins,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

app.use(helmet());

app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin ||
        config.NODE_ENV === 'development' ||
        origins.includes(origin)
      ) {
        return cb(null, true);
      }

      cb(new Error('Origin not allowed'));
    },
  }),
);

app.use(express.json({
  limit: '200kb',
}));

app.use(pinoHttp());

app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'unavailable',
    });
  }
});

app.use('/api/auth', auth);
app.use('/api/admin', admin);
app.use('/api/visitors', visitors);
app.use('/api/reports', reports);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      throw new Error('Missing token');
    }

    const jwt = require('jsonwebtoken');

    const c = jwt.verify(
      token,
      config.JWT_ACCESS_SECRET,
      {
        issuer: 'estate-visitor-api',
        audience: 'estate-mobile',
      },
    );

    (socket as any).claims = c;

    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const c = (socket as any).claims;

  socket.join(c.estateId);
});

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err?.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid request',
        details: err.issues,
      });
    }

    console.error(err);

    res.status(500).json({
      error: 'Internal server error',
    });
  },
);

const server = http.listen(config.PORT, () => {
  console.log(`API listening on ${config.PORT}`);
});

async function shutdown() {
  server.close();
  io.close();

  await pool.end();

  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);