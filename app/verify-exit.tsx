import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { Button, Card, Field, Title, s } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function VerifyExit() {
  const { visitors, updateVisitor, user } = useApp();

  const [token, setToken] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [called, setCalled] = useState(false);

  const v =
    visitors.find(
      (x) =>
        x.exitToken &&
        x.exitToken.toLowerCase() === token.trim().toLowerCase(),
    ) || visitors.find((x) => x.id === selected);

  function lookup() {
    const found = visitors.find(
      (x) =>
        x.exitToken &&
        x.exitToken.toLowerCase() === token.trim().toLowerCase(),
    );

    if (found) {
      setSelected(found.id);
    } else {
      Alert.alert(
        'Not found',
        'No matching exit token.',
      );
    }
  }

  function confirm() {
    if (!v || v.status !== 'EXIT_REQUESTED' || !called) {
      Alert.alert(
        'Verification required',
        'Validate the exit pass and call the resident before confirming sign-out.',
      );

      return;
    }

    updateVisitor(v.id, {
      status: 'EXITED',
      exitAt: new Date().toISOString(),
      exitOfficer: user?.staffId || user?.id,
    });

    Alert.alert(
      'Sign-out recorded',
      'Resident exit notification is simulated. The visit is automatically saved to history.',
    );
  }

  return (
    <ScrollView style={s.page}>
      <Title sub="A separate one-time exit credential is required">
        Verify Visitor Exit
      </Title>

      <Field
        label="Exit token"
        value={token}
        onChangeText={setToken}
        placeholder="EV-EXIT-XXXXXX"
      />

      <Button
        title="Look up exit pass"
        onPress={lookup}
      />

      {v ? (
        <Card>
          <Text
            style={{
              fontWeight: '900',
              fontSize: 18,
            }}
          >
            {v.fullName}
          </Text>

          <Text>
            {v.phone} · {v.purpose}
          </Text>

          <Text>
            Entry time:{' '}
            {v.entryAt
              ? new Date(v.entryAt).toLocaleString()
              : '—'}
          </Text>

          <Text
            style={{
              fontWeight: '800',
              marginTop: 10,
            }}
          >
            HOST INFORMATION
          </Text>

          <Text>
            {v.residentName} · House {v.houseNumber}
          </Text>

          <Text>
            Resident registered phone: {v.residentPhone}
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontWeight: '800',
            }}
          >
            EXIT VERIFICATION PENDING
          </Text>

          <Button
            title="I called the resident and confirmed"
            kind="secondary"
            onPress={() => {
              setCalled(true);

              Alert.alert(
                'Call confirmation',
                'Call confirmation marked for this demo. Production should record time and officer.',
              );
            }}
          />

          <Button
            title="CONFIRM SIGN-OUT"
            onPress={confirm}
          />
        </Card>
      ) : null}

      <Text style={{ color: '#66736B' }}>
        Do not mark an exit complete until the resident call verification
        has been performed.
      </Text>
    </ScrollView>
  );
}