import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { width } = useWindowDimensions();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');

  const isWide = width >= 980;

  const onSubmit = () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      return;
    }

    if (password !== passwordRepeat) {
      return;
    }

    signIn(fullName.trim());
    router.replace('/');
  };

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.contentWrap, isWide && styles.contentWrapWide]}>
        <View style={[styles.visualArea, { backgroundColor: colorScheme === 'dark' ? '#1D2326' : '#FFE9D2' }]}>
          <View style={[styles.floatCard, styles.floatTopLeft, { backgroundColor: '#E8C5FF' }]}>
            <ThemedText type="defaultSemiBold">Register</ThemedText>
          </View>

          <View style={[styles.heroCard, { backgroundColor: colorScheme === 'dark' ? '#2E3A41' : '#FFCF8C' }]}>
            <ThemedText style={styles.heroText}>Build Profile</ThemedText>
          </View>

          <View style={[styles.outlineSticker, styles.outlineLeft]}>
            <ThemedText type="defaultSemiBold" style={styles.stickerText}>
              Create
            </ThemedText>
          </View>

          <View style={[styles.outlineSticker, styles.outlineRight]}>
            <ThemedText type="defaultSemiBold" style={styles.stickerText}>
              Share
            </ThemedText>
          </View>

          <View style={[styles.floatCard, styles.floatBottomLeft, { backgroundColor: '#CDEFEA' }]}>
            <ThemedText type="defaultSemiBold">Data</ThemedText>
          </View>

          <View style={[styles.floatCard, styles.floatBottomRight, { backgroundColor: '#FFD9C2' }]}>
            <ThemedText type="defaultSemiBold">Cloud</ThemedText>
          </View>

          <ThemedText style={styles.visualCaption}>Kayit tarafı tanitim gorselleri bu alanda doner.</ThemedText>
        </View>

        <View
          style={[
            styles.formCard,
            {
              borderColor: colorScheme === 'dark' ? '#303538' : '#D7DEE5',
              backgroundColor: colorScheme === 'dark' ? '#1B1E20' : '#F7FAFF',
            },
          ]}>
          <ThemedText type="title" style={styles.title}>
            Kaydol
          </ThemedText>
          <ThemedText style={styles.subtitle}>Yeni hesap olustur ve basla.</ThemedText>

          <TextInput
            placeholder="Ad Soyad"
            placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
            value={fullName}
            onChangeText={setFullName}
            style={[styles.input, { borderColor: colorScheme === 'dark' ? '#41484C' : '#C6CED6', color: colors.text }]}
          />

          <TextInput
            placeholder="E-posta"
            placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            style={[styles.input, { borderColor: colorScheme === 'dark' ? '#41484C' : '#C6CED6', color: colors.text }]}
          />

          <TextInput
            placeholder="Sifre"
            placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { borderColor: colorScheme === 'dark' ? '#41484C' : '#C6CED6', color: colors.text }]}
          />

          <TextInput
            placeholder="Sifre (Tekrar)"
            placeholderTextColor={colorScheme === 'dark' ? '#9BA1A6' : '#687076'}
            secureTextEntry
            value={passwordRepeat}
            onChangeText={setPasswordRepeat}
            style={[styles.input, { borderColor: colorScheme === 'dark' ? '#41484C' : '#C6CED6', color: colors.text }]}
          />

          <Pressable onPress={onSubmit} style={[styles.submitBtn, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.submitText}>Kaydol</ThemedText>
          </Pressable>

          <Pressable onPress={() => router.push('/auth')} style={styles.linkBtn}>
            <ThemedText type="link">Hesabin var mi? Oturum Ac</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 48,
    paddingVertical: 16,
    justifyContent: 'center',
    backgroundColor: '#F2F6FC',
  },
  contentWrap: {
    gap: 14,
  },
  contentWrapWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 32,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  visualArea: {
    flex: 1,
    minHeight: 430,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D7DEE5',
    padding: 20,
  },
  formCard: {
    flex: 0.85,
    maxWidth: 380,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 18,
    textAlign: 'center',
    opacity: 0.75,
  },
  floatCard: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  floatTopLeft: {
    top: 24,
    left: 24,
  },
  floatBottomLeft: {
    left: 38,
    bottom: 58,
  },
  floatBottomRight: {
    right: 28,
    bottom: 30,
  },
  outlineSticker: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    width: 170,
    height: 118,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  outlineLeft: {
    left: 95,
    top: 142,
    transform: [{ rotate: '-14deg' }],
  },
  outlineRight: {
    right: 96,
    top: 124,
    transform: [{ rotate: '4deg' }],
  },
  heroCard: {
    position: 'absolute',
    left: '26%',
    top: 52,
    width: 240,
    height: 290,
    borderRadius: 30,
    justifyContent: 'flex-end',
    padding: 16,
  },
  heroText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  stickerText: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  visualCaption: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    fontSize: 13,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 13,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  linkBtn: {
    marginTop: 14,
    alignItems: 'center',
  },
});
