"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPassword = exports.hashPassword = void 0;
exports.accessToken = accessToken;
exports.verifyAccess = verifyAccess;
exports.opaqueToken = opaqueToken;
exports.tokenHash = tokenHash;
exports.randomId = randomId;
const node_crypto_1 = __importDefault(require("node:crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const argon2_1 = __importDefault(require("argon2"));
const config_1 = require("./config");
const hashPassword = (password) => argon2_1.default.hash(password, {
    type: argon2_1.default.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
});
exports.hashPassword = hashPassword;
const verifyPassword = (hash, password) => argon2_1.default.verify(hash, password);
exports.verifyPassword = verifyPassword;
function accessToken(claims) {
    return jsonwebtoken_1.default.sign(claims, config_1.config.JWT_ACCESS_SECRET, {
        expiresIn: `${config_1.config.ACCESS_TOKEN_MINUTES}m`,
        issuer: 'estate-visitor-api',
        audience: 'estate-mobile',
    });
}
function verifyAccess(token) {
    return jsonwebtoken_1.default.verify(token, config_1.config.JWT_ACCESS_SECRET, {
        issuer: 'estate-visitor-api',
        audience: 'estate-mobile',
    });
}
function opaqueToken() {
    return node_crypto_1.default.randomBytes(32).toString('base64url');
}
function tokenHash(token) {
    return node_crypto_1.default
        .createHash('sha256')
        .update(token)
        .digest('hex');
}
function randomId() {
    return node_crypto_1.default.randomUUID();
}
