import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';

import {
  Button,
  Card,
  Title,
  s,
} from '../../components/UI';

import { useApp } from '../../context/AppContext';

export default function Profile() {
  const { user, logout } = useApp();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={{ paddingBottom: 35 }}
    >
      <Title sub="Account and access settings">
        My Profile
      </Title>

      <Card>
        <Text
          style={{
            fontWeight: '900',
            fontSize: 18,
            marginBottom: 10,
          }}
        >
          {user?.name || 'Account holder'}
        </Text>

        <Text>
          Username: {user?.username || 'Not available'}
        </Text>

        <Text>
          Role: {user?.role || 'Not available'}
        </Text>

        <Text>
          Phone: {user?.phone || 'Not provided by server'}
        </Text>

        <Text>
          House: {user?.houseNumber || 'Not available'}
        </Text>

        <Text>
          Staff ID: {user?.staffId || 'Not available'}
        </Text>
      </Card>

      <Button
        title="Change password"
        kind="secondary"
        onPress={() => router.push('/change-password')}
      />

      <Button
        title="Log out"
        kind="danger"
        onPress={handleLogout}
      />
    </ScrollView>
  );
}