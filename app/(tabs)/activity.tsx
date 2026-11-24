import { ScrollView, Text } from 'react-native';

import { Card, Title, s } from '../../components/UI';
import { useApp } from '../../context/AppContext';

export default function Activity() {
  const { visitors, user } = useApp();

  const rows =
    user?.role === 'resident'
      ? visitors.filter((v) => v.residentPhone === user.phone)
      : visitors;

  return (
    <ScrollView style={s.page}>
      <Title sub="Recorded visit lifecycle">
        Visitor History
      </Title>

      {rows.map((v) => (
        <Card key={v.id}>
          <Text style={{ fontWeight: '900' }}>
            {v.fullName}
          </Text>

          <Text>
            {v.purpose} · {v.status.replaceAll('_', ' ')}
          </Text>

          <Text>
            House {v.houseNumber} · {v.phone}
          </Text>

          <Text>
            Entry:{' '}
            {v.entryAt
              ? new Date(v.entryAt).toLocaleString()
              : 'Not entered'}
          </Text>

          <Text>
            Exit:{' '}
            {v.exitAt
              ? new Date(v.exitAt).toLocaleString()
              : 'Not exited'}
          </Text>

          <Text>
            Entry officer: {v.entryOfficer || '—'} · Exit officer:{' '}
            {v.exitOfficer || '—'}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}