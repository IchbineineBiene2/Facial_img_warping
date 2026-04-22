import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const router = useRouter();
  const { userName, signOut } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (!userName) {
      router.replace('/auth');
    }
  }, [router, userName]);

  if (!userName) {
    return null;
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.card, { borderColor: colorScheme === 'dark' ? '#303538' : '#D7DEE5' }]}>
        <ThemedText type="title">Profil</ThemedText>
        <ThemedText style={styles.nameText}>{userName}</ThemedText>

        <Pressable onPress={() => router.push('/')} style={[styles.homeBtn, { backgroundColor: colors.tint }]}>
          <ThemedText style={styles.homeBtnText}>Ana Sayfaya Don</ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            signOut();
            router.replace('/');
          }}
          style={styles.signOutBtn}>
          <ThemedText type="link">Oturumu Kapat</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  nameText: {
    fontSize: 18,
  },
  homeBtn: {
    marginTop: 8,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  signOutBtn: {
    alignItems: 'center',
    marginTop: 8,
  },
});
