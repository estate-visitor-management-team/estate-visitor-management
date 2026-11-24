import { Expo } from 'expo-server-sdk';

import { pool } from '../db';
import { config } from '../config';

const expo = new Expo({
  accessToken: config.EXPO_ACCESS_TOKEN,
});

export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
) {
  const { rows } = await pool.query(
    `
      SELECT expo_push_token
      FROM users
      WHERE id = $1
        AND active = true
    `,
    [userId],
  );

  const token = rows[0]?.expo_push_token;

  if (!token || !Expo.isExpoPushToken(token)) {
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