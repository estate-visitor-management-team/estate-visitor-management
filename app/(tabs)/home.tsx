import { router } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button, Card, Stat, Title, s } from '../../components/UI';
import { useApp } from '../../context/AppContext';
import { Visitor } from '../../types';

function fmt(v?: string) {
  return v ? new Date(v).toLocaleString() : '—';
}

export default function Home() {
  const { user, visitors, updateVisitor } = useApp();

  if (!user) {
    return (
      <View style={s.page}>
        <Text>Please sign in.</Text>
      </View>
    );
  }

  const mine =
    user.role === 'resident'
      ? visitors.filter((v) => v.residentPhone === user.phone)
      : visitors;

  const inside = mine.filter((v) => v.status === 'INSIDE');

  const pending = mine.filter(
    (v) => v.status === 'AWAITING_APPROVAL',
  );

  const expected = mine.filter(
    (v) => v.status === 'EXPECTED',
  );

  const completed = mine.filter((v) =>
    ['EXITED', 'COMPLETED'].includes(v.status),
  );

  const makeCheckout = (v: Visitor) => {
    const token =
      'EV-EXIT-' +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    updateVisitor(v.id, {
      status: 'EXIT_REQUESTED',
      exitToken: token,
    });

    Alert.alert(
      'Exit pass generated',
      `Share this one-time demo exit token with the visitor:\n\n${token}`,
    );
  };

  return (
    <ScrollView
      style={s.page}
      contentContainerStyle={{ paddingBottom: 35 }}
    >
      <Title sub={`${user.name} · ${user.role.toUpperCase()}`}>
        {user.role === 'resident'
          ? 'Resident Dashboard'
          : user.role === 'security'
            ? 'Gate Security Dashboard'
            : 'Estate Management Dashboard'}
      </Title>

      {user.role === 'resident' ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <Stat label="Today's visitors" value={mine.length} />

            <Stat label="Expected" value={expected.length} />

            <Stat label="Currently visiting" value={inside.length} />

            <Stat label="Pending approvals" value={pending.length} />

            <Stat label="Completed visits" value={completed.length} />
          </View>

          <Button
            title="＋ Register new visitor"
            onPress={() => router.push('/register-visitor')}
          />

          <Title sub="Visitors linked to your house">
            My active visitors
          </Title>

          {mine.map((v) => (
            <Card key={v.id}>
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 16,
                }}
              >
                {v.fullName}
              </Text>

              <Text
                style={{
                  color: '#66736B',
                  marginTop: 4,
                }}
              >
                {v.purpose} · {v.status.replaceAll('_', ' ')}
              </Text>

              <Text style={{ marginTop: 5 }}>
                Entry token: {v.entryToken}
              </Text>

              {v.status === 'INSIDE' ? (
                <Button
                  title="Request visitor checkout"
                  onPress={() => makeCheckout(v)}
                />
              ) : null}

              {v.status === 'EXITED' ? (
                <Button
                  title="DONE · Acknowledge departure"
                  kind="secondary"
                  onPress={() => {
                    updateVisitor(v.id, {
                      status: 'COMPLETED',
                      residentAcknowledged: true,
                    });

                    Alert.alert(
                      'Acknowledged',
                      'Visit moved to completed history.',
                    );
                  }}
                />
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

      {user.role === 'security' ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <Stat label="Today's visitors" value={mine.length} />

            <Stat label="Awaiting approval" value={pending.length} />

            <Stat label="Currently inside" value={inside.length} />

            <Stat
              label="Exit requests"
              value={
                mine.filter((v) => v.status === 'EXIT_REQUESTED').length
              }
            />
          </View>

          <Button
            title="Verify entry token"
            onPress={() => router.push('/verify-entry')}
          />

          <Button
            title="Verify exit token"
            onPress={() => router.push('/verify-exit')}
            kind="secondary"
          />

          <Title sub="Live gate register">
            Currently inside estate
          </Title>

          {inside.map((v) => (
            <Card key={v.id}>
              <Text style={{ fontWeight: '800' }}>
                {v.fullName}
              </Text>

              <Text>
                {v.phone} · House {v.houseNumber}
              </Text>

              <Text>
                Host: {v.residentName} ({v.residentPhone})
              </Text>

              <Text>
                Entered: {fmt(v.entryAt)}
              </Text>
            </Card>
          ))}

          <Title>
            Awaiting resident approval
          </Title>

          {pending.map((v) => (
            <Card key={v.id}>
              <Text style={{ fontWeight: '800' }}>
                {v.fullName}
              </Text>

              <Text>
                {v.phone} · {v.residentName} · {v.houseNumber}
              </Text>

              <Text>
                Approval is pending in this demo prototype.
              </Text>
            </Card>
          ))}
        </>
      ) : null}

      {user.role === 'admin' ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <Stat label="Residents" value={24} />

            <Stat label="Houses" value={36} />

            <Stat label="Security officers" value={8} />

            <Stat label="Visitors today" value={mine.length} />

            <Stat label="Currently inside" value={inside.length} />

            <Stat label="Completed visits" value={completed.length} />

            <Stat label="Pending approvals" value={pending.length} />

            <Stat
              label="Rejected visitors"
              value={mine.filter((v) => v.status === 'REJECTED').length}
            />
          </View>

          <Title sub="Administrative control centre">
            Estate operations
          </Title>

          {[
            'Resident management',
            'House / unit management',
            'Security staff and shifts',
            'Visitor register',
            'Reports and analytics',
            'Audit trail',
            'Estate settings',
          ].map((x) => (
            <Card key={x}>
              <Text style={{ fontWeight: '800' }}>
                {x}
              </Text>

              <Text
                style={{
                  color: '#66736B',
                  marginTop: 4,
                }}
              >
                Module placeholder — backend administration screen is part
                of the next implementation stage.
              </Text>
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}