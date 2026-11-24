import { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
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
      'Unable to change password.'
    );
  }

  return 'An unexpected error occurred.';
}

export default function ChangePassword() {
  const { completePasswordChange } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        'Missing information',
        'Complete all password fields.',
      );
      return;
    }

    if (newPassword.length < 12) {
      Alert.alert(
        'Password too short',
        'Your new password must contain at least 12 characters.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Password mismatch',
        'The new password and confirmation do not match.',
      );
      return;
    }

    try {
      setLoading(true);

      await completePasswordChange(
        currentPassword,
        newPassword,
      );

      Alert.alert(
        'Password changed',
        'Your password was changed successfully. Please sign in again.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/login'),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Password change failed',
        getErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={{ paddingBottom: 35 }}
      keyboardShouldPersistTaps="handled"
    >
      <Title sub="Your administrator provided a temporary password. Create a new password to continue.">
        Change password
      </Title>

      <Text
        style={{
          color: colors.muted,
          lineHeight: 22,
          marginBottom: 22,
        }}
      >
        Choose a password of at least 12 characters. You will need
        to sign in again after changing it.
      </Text>

      <Field
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Temporary password"
        secureTextEntry
        autoCapitalize="none"
      />

      <Field
        label="New password"
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="At least 12 characters"
        secureTextEntry
        autoCapitalize="none"
      />

      <Field
        label="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Enter the new password again"
        secureTextEntry
        autoCapitalize="none"
      />

      <Button
        title={loading ? 'Changing password...' : 'Change password'}
        onPress={handleChangePassword}
      />
    </ScrollView>
  );
}