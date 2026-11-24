
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  api,
  clearSession,
  getSavedSession,
  saveSession,
} from '../services/api';

import {
  AppUser,
  AuthMeResponse,
  LoginResponse,
  UserRole,
  Visitor,
} from '../types';

type ContextValue = {
  user: AppUser | null;
  visitors: Visitor[];
  isReady: boolean;
  mustChangePassword: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  completePasswordChange: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  addVisitor: (visitor: Visitor) => void;
  updateVisitor: (id: string, patch: Partial<Visitor>) => void;
};

const Ctx = createContext<ContextValue | null>(null);

function mapRole(
  role: AuthMeResponse['user']['role'],
): UserRole {
  switch (role) {
    case 'ADMIN':
      return 'admin';

    case 'RESIDENT':
      return 'resident';

    case 'SECURITY':
      return 'security';
  }
}

function mapUser(
  data: AuthMeResponse['user'],
): AppUser {
  return {
    id: data.id,
    name: data.fullName,
    username: data.username,
    role: mapRole(data.role),
    phone: data.phone,
    estateId: data.estateId,
    houseId: data.houseId,
    houseNumber: data.houseNumber,
    staffId: data.staffId,
  };
}

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [mustChangePassword, setMustChangePassword] =
    useState(false);

  const refreshProfile = useCallback(async () => {
    const response = await api.get<AuthMeResponse>('/auth/me');

    const authenticatedUser = mapUser(response.data.user);

    setUser(authenticatedUser);
    setMustChangePassword(
      response.data.user.mustChangePassword,
    );
  }, []);

  // Restore and verify the session on app startup.
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const saved = await getSavedSession();

        if (!saved.accessToken) {
          await clearSession();
          return;
        }

        const response = await api.get<AuthMeResponse>(
          '/auth/me',
        );

        if (!mounted) return;

        const authenticatedUser = mapUser(
          response.data.user,
        );

        setUser(authenticatedUser);
        setMustChangePassword(
          response.data.user.mustChangePassword,
        );
      } catch (error) {
        console.error(
          'Session restoration failed:',
          error,
        );

        await clearSession();

        if (mounted) {
          setUser(null);
          setMustChangePassword(false);
        }
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Sign in using real backend credentials.
  const signIn = useCallback(
    async (username: string, password: string) => {
      const response = await api.post<LoginResponse>(
        '/auth/login',
        {
          username: username.trim(),
          password,
        },
      );

      const result = response.data;

      // Save the access token before requesting /auth/me.
      // The API interceptor uses this token automatically.
      const temporaryUser: AppUser = {
        id: result.user.id,
        name: username.trim(),
        username: username.trim(),
        role: mapRole(result.user.role),
        phone: '',
        estateId: '',
      };

      await saveSession(
        result.accessToken,
        result.refreshToken,
        temporaryUser,
        result.mustChangePassword,
      );

      try {
        const profile = await api.get<AuthMeResponse>(
          '/auth/me',
        );

        const authenticatedUser = mapUser(
          profile.data.user,
        );

        await saveSession(
          result.accessToken,
          result.refreshToken,
          authenticatedUser,
          profile.data.user.mustChangePassword,
        );

        setUser(authenticatedUser);
        setMustChangePassword(
          profile.data.user.mustChangePassword,
        );
        setVisitors([]);
      } catch (error) {
        await clearSession();
        setUser(null);
        setMustChangePassword(false);

        throw error;
      }
    },
    [],
  );

  // Change password and require a fresh login.
  const completePasswordChange = useCallback(
    async (
      currentPassword: string,
      newPassword: string,
    ) => {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      await clearSession();

      setUser(null);
      setMustChangePassword(false);
      setVisitors([]);
    },
    [],
  );

  // Revoke the current backend session before clearing local data.
  const logout = useCallback(async () => {
    try {
      if (user) {
        await api.post('/auth/logout');
      }
    } finally {
      await clearSession();

      setUser(null);
      setMustChangePassword(false);
      setVisitors([]);
    }
  }, [user]);

  // Temporary compatibility methods.
  // Visitor screens will be moved to real API operations next.
  const addVisitor = useCallback((visitor: Visitor) => {
    setVisitors((current) => [
      visitor,
      ...current,
    ]);
  }, []);

  const updateVisitor = useCallback(
    (id: string, patch: Partial<Visitor>) => {
      setVisitors((current) =>
        current.map((visitor) =>
          visitor.id === id
            ? { ...visitor, ...patch }
            : visitor,
        ),
      );
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      visitors,
      isReady,
      mustChangePassword,
      signIn,
      completePasswordChange,
      logout,
      refreshProfile,
      addVisitor,
      updateVisitor,
    }),
    [
      user,
      visitors,
      isReady,
      mustChangePassword,
      signIn,
      completePasswordChange,
      logout,
      refreshProfile,
      addVisitor,
      updateVisitor,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): ContextValue {
  const context = useContext(Ctx);

  if (!context) {
    throw new Error(
      'useApp must be used inside AppProvider',
    );
  }

  return context;
}
