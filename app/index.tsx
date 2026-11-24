import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';

import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

export default function Index() {
  const {
    user,
    isReady,
    mustChangePassword,
  } = useApp();

  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (mustChangePassword) {
      router.replace('/change-password');
      return;
    }

    router.replace('/(tabs)/home');
  }, [user, isReady, mustChangePassword]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator
        size="large"
        color={colors.primary}
      />
    </View>
  );
}