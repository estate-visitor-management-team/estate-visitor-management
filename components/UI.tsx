import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { colors } from '../constants/colors';

export function Button({
  title,
  onPress,
  kind = 'primary',
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.button,
        kind === 'secondary' && s.secondary,
        kind === 'danger' && s.danger,
      ]}
    >
      <Text
        style={[
          s.buttonText,
          kind === 'secondary' && s.secondaryText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={{ marginBottom: 13 }}>
      <Text style={s.label}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={s.input}
      />
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.card, style]}>
      {children}
    </View>
  );
}

export function Title({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={s.title}>
        {children}
      </Text>

      {sub ? (
        <Text style={s.sub}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function Stat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <Card style={{ flex: 1, minWidth: '44%' }}>
      <Text style={s.stat}>
        {value}
      </Text>

      <Text style={s.sub}>
        {label}
      </Text>
    </Card>
  );
}

export const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 56,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.text,
  },

  sub: {
    color: colors.muted,
    marginTop: 5,
  },

  label: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    padding: 13,
    fontSize: 15,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: 11,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    marginTop: 8,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },

  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
  },

  secondaryText: {
    color: colors.primary,
  },

  danger: {
    backgroundColor: colors.danger,
  },

  stat: {
    fontSize: 25,
    fontWeight: '900',
    color: colors.primary,
  },
});