"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const db_1 = require("../db");
async function main() {
    const sql = node_fs_1.default.readFileSync(node_path_1.default.join(__dirname, '../../migrations/001_initial.sql'), 'utf8');
    await db_1.pool.query(sql);
    console.log('Migration applied');
    await db_1.pool.end();
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
