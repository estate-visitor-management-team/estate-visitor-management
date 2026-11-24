import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';

import {
  Button,
  Field,
  Title,
  s,
} from '../components/UI';

import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Unable to sign in.'
    );
  }

  return 'An unexpected error occurred.';
}

export default function Login() {
  const { signIn } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password) {
      Alert.alert(
        'Missing information',
        'Enter your username and password.',
      );
      return;
    }

    try {
      setLoading(true);

      await signIn(username, password);

      // The root route checks whether a password change is required.
      router.replace('/');
    } catch (error) {
      Alert.alert('Sign-in failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 35,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Title sub="Secure visitor registration, approval and estate access management">
        ESTATE VISITOR MANAGEMENT
      </Title>

      <Text
        style={{
          color: colors.muted,
          marginBottom: 25,
          lineHeight: 22,
        }}
      >
        Sign in with the account credentials provided by your estate
        administrator.
      </Text>

      <Field
        label="Username"
        value={username}
        onChangeText={setUsername}
        placeholder="Enter your username"
        autoCapitalize="none"
      />

      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        secureTextEntry
        autoCapitalize="none"
      />

      <Button
        title={loading ? 'Signing in...' : 'Sign in'}
        onPress={handleLogin}
      />

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 15 }}
          color={colors.primary}
        />
      ) : null}

      <View style={{ marginTop: 25 }}>
        <Text
          style={{
            color: colors.muted,
            textAlign: 'center',
            lineHeight: 21,
          }}
        >
          Don't have an account? Contact your estate administrator
          to receive your login credentials.
        </Text>
      </View>
    </ScrollView>
  );
}