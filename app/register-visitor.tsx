import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';

import { Button, Field, Title, s } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function RegisterVisitor() {
  const { user, addVisitor } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');

  const [date, setDate] = useState(
    new Date(Date.now() + 3600000).toISOString().slice(0, 16),
  );

  const [extra, setExtra] = useState('');

  function submit() {
    if (!user || user.role !== 'resident') {
      return;
    }

    if (!name.trim() || phone.trim().length < 7 || !purpose.trim()) {
      Alert.alert(
        'Check details',
        'Enter visitor name, a valid phone number and purpose.',
      );

      return;
    }

    const token =
      'EV-ENTRY-' +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    addVisitor({
      id: 'VIS-' + Date.now(),
      fullName: name.trim(),
      phone: phone.trim(),
      purpose: purpose.trim(),
      expectedAt: new Date(date).toISOString(),
      additionalInfo: extra,
      houseNumber: user.houseNumber || '—',
      residentName: user.name,
      residentPhone: user.phone,
      status: 'EXPECTED',
      entryToken: token,
      createdAt: new Date().toISOString(),
    });

    Alert.alert(
      'Visitor registered',
      `Demo entry token: ${token}\n\nQR generation and WhatsApp/SMS sharing will be connected to the backend stage.`,
      [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/home'),
        },
      ],
    );
  }

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Title sub="Create an invitation for a visitor">
        Register New Visitor
      </Title>

      <Field
        label="Visitor full name"
        value={name}
        onChangeText={setName}
        placeholder="Enter full name"
      />

      <Field
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="080..."
      />

      <Field
        label="Purpose of visit"
        value={purpose}
        onChangeText={setPurpose}
        placeholder="e.g. Family visit"
      />

      <Field
        label="Expected arrival (YYYY-MM-DDTHH:mm)"
        value={date}
        onChangeText={setDate}
      />

      <Field
        label="Additional information (optional)"
        value={extra}
        onChangeText={setExtra}
      />

      <Text
        style={{
          color: '#66736B',
          marginBottom: 10,
        }}
      >
        House number and host contact are linked automatically to your
        account.
      </Text>

      <Button
        title="Register visitor & generate entry token"
        onPress={submit}
      />
    </ScrollView>
  );
}