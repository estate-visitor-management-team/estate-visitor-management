"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_http_1 = __importDefault(require("pino-http"));
const node_http_1 = require("node:http");
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const visitors_1 = __importDefault(require("./routes/visitors"));
const reports_1 = __importDefault(require("./routes/reports"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const http = (0, node_http_1.createServer)(app);
const origins = config_1.config.CORS_ORIGINS
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const io = new socket_io_1.Server(http, {
    cors: {
        origin: config_1.config.NODE_ENV === 'development'
            ? true
            : origins,
        methods: ['GET', 'POST'],
    },
});
app.set('io', io);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        if (!origin ||
            config_1.config.NODE_ENV === 'development' ||
            origins.includes(origin)) {
            return cb(null, true);
        }
        cb(new Error('Origin not allowed'));
    },
}));
app.use(express_1.default.json({
    limit: '200kb',
}));
app.use((0, pino_http_1.default)());
app.use('/api/auth/login', (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.get('/health', async (_req, res) => {
    try {
        await db_1.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            database: 'connected',
        });
    }
    catch {
        res.status(503).json({
            status: 'unavailable',
        });
    }
});
app.use('/api/auth', auth_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/visitors', visitors_1.default);
app.use('/api/reports', reports_1.default);
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            throw new Error('Missing token');
        }
        const jwt = require('jsonwebtoken');
        const c = jwt.verify(token, config_1.config.JWT_ACCESS_SECRET, {
            issuer: 'estate-visitor-api',
            audience: 'estate-mobile',
        });
        socket.claims = c;
        next();
    }
    catch {
        next(new Error('Unauthorized'));
    }
});
io.on('connection', (socket) => {
    const c = socket.claims;
    socket.join(c.estateId);
});
app.use((err, _req, res, _next) => {
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
});
const server = http.listen(config_1.config.PORT, () => {
    console.log(`API listening on ${config_1.config.PORT}`);
});
async function shutdown() {
    server.close();
    io.close();
    await db_1.pool.end();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
