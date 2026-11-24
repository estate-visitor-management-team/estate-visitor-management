
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';

import { AppUser } from '../types';

const baseURL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

if (!baseURL) {
  console.warn(
    'EXPO_PUBLIC_API_URL is not configured. Add it to your frontend .env file.',
  );
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(key)
      : null;
  }

  return SecureStore.getItemAsync(key);
}

async function storageSet(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(
  accessToken: string,
  refreshToken: string,
  user: AppUser,
  mustChangePassword: boolean,
): Promise<void> {
  await Promise.all([
    storageSet('accessToken', accessToken),
    storageSet('refreshToken', refreshToken),
    storageSet('authenticatedUser', JSON.stringify(user)),
    storageSet(
      'mustChangePassword',
      String(mustChangePassword),
    ),
  ]);
}

export async function getSavedSession(): Promise<{
  accessToken: string | null;
}> {
  const accessToken = await storageGet('accessToken');

  return { accessToken };
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    storageDelete('accessToken'),
    storageDelete('refreshToken'),
    storageDelete('authenticatedUser'),
    storageDelete('mustChangePassword'),
  ]);
}

api.interceptors.request.use(async (request) => {
  const token = await storageGet('accessToken');

  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }

  return request;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = String(error.config?.url || '');

    // The backend currently has no refresh-token endpoint.
    // Do not attempt automatic refresh.
    if (
      error.response?.status === 401 &&
      !requestUrl.includes('/auth/login')
    ) {
      await clearSession();
    }

    return Promise.reject(error);
  },
);

export async function connectLiveUpdates(): Promise<Socket> {
  const token = await storageGet('accessToken');

  if (!token || !baseURL) {
    throw new Error('No authenticated API session');
  }

  // The API is mounted at /api, but Socket.IO is mounted
  // at the server origin.
  const socketURL = baseURL.replace(
    /\/api(?:\/v\d+)?\/?$/,
    '',
  );

  return io(socketURL, {
    auth: { token },
    transports: ['websocket'],
  });
}
