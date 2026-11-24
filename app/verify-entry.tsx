import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';

import { Button, Card, Field, Title, s } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function VerifyEntry() {
  const { visitors, updateVisitor, user } = useApp();

  const [token, setToken] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const v =
    visitors.find(
      (x) => x.entryToken.toLowerCase() === token.trim().toLowerCase(),
    ) || visitors.find((x) => x.id === selected);

  function request() {
    if (!v || v.status !== 'EXPECTED') {
      Alert.alert(
        'Cannot request',
        'Token not found, expired or not in an entry-ready state.',
      );

      return;
    }

    updateVisitor(v.id, {
      status: 'AWAITING_APPROVAL',
    });

    Alert.alert(
      'Permission requested',
      'Resident approval notification is simulated in this prototype.',
    );
  }

  function confirm() {
    if (!v || v.status !== 'APPROVED') {
      Alert.alert(
        'Not approved',
        'Resident approval is required before entry.',
      );

      return;
    }

    updateVisitor(v.id, {
      status: 'INSIDE',
      entryAt: new Date().toISOString(),
      entryOfficer: user?.staffId || user?.id,
    });

    Alert.alert(
      'Entry recorded',
      'Visitor is now marked INSIDE ESTATE.',
    );
  }

  return (
    <ScrollView style={s.page}>
      <Title sub="Scan QR in a later camera-enabled build, or enter the token manually">
        Verify Visitor Entry
      </Title>

      <Field
        label="Entry token"
        value={token}
        onChangeText={setToken}
        placeholder="EV-ENTRY-XXXXXX"
      />

      <Button
        title="Look up visitor"
        onPress={() => {
          const found = visitors.find(
            (x) =>
              x.entryToken.toLowerCase() === token.trim().toLowerCase(),
          );

          if (found) {
            setSelected(found.id);
          } else {
            Alert.alert(
              'Not found',
              'No matching token in demo records.',
            );
          }
        }}
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
            Expected: {new Date(v.expectedAt).toLocaleString()}
          </Text>

          <Text
            style={{
              marginTop: 10,
              fontWeight: '800',
            }}
          >
            HOST INFORMATION
          </Text>

          <Text>
            {v.residentName} · House {v.houseNumber}
          </Text>

          <Text>
            Resident phone: {v.residentPhone}
          </Text>

          <Text>
            Status: {v.status}
          </Text>

          <Button
            title="REQUEST PERMISSION"
            onPress={request}
          />

          <Button
            title="CONFIRM ENTRY (after resident approval)"
            onPress={confirm}
            kind="secondary"
          />
        </Card>
      ) : null}

      <Text style={{ color: '#66736B' }}>
        Prototype note: resident approval is not bypassed; the production
        backend must verify the approval status before accepting entry.
      </Text>
    </ScrollView>
  );
}