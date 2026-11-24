"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUser = notifyUser;
const expo_server_sdk_1 = require("expo-server-sdk");
const db_1 = require("../db");
const config_1 = require("../config");
const expo = new expo_server_sdk_1.Expo({
    accessToken: config_1.config.EXPO_ACCESS_TOKEN,
});
async function notifyUser(userId, title, body, data = {}) {
    const { rows } = await db_1.pool.query(`
      SELECT expo_push_token
      FROM users
      WHERE id = $1
        AND active = true
    `, [userId]);
    const token = rows[0]?.expo_push_token;
    if (!token || !expo_server_sdk_1.Expo.isExpoPushToken(token)) {
        return;
    }
    await expo.sendPushNotificationsAsync([
        {
            to: token,
            sound: 'default',
            title,
            body,
            data,
        },
    ]);
}
