import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { SideNav } from '@/components/side-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const router = useRouter();
  const { userName } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const [imageStates, setImageStates] = useState([0, 0, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setImageStates((prev) => prev.map((state) => (state === 0 ? 1 : 0)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const goProfileOrAuth = () => {
    if (userName) {
      router.push('/profile');
      return;
    }
    router.push('/auth');
  };

  const isWide = width >= 1024;

  return (
    <ThemedView style={styles.screen}>
      <SideNav />

      <View style={styles.mainContent}>
        <View style={styles.topBar}>
          <View style={styles.authActions}>
            <Pressable onPress={goProfileOrAuth} style={styles.profileIconButton}>
              <Ionicons name="person-circle-outline" size={28} color={Colors[colorScheme].text} />
            </Pressable>
            <Pressable onPress={goProfileOrAuth} style={styles.authButton}>
              <ThemedText type="defaultSemiBold" style={styles.authButtonText}>
                {userName ? userName : 'Oturum Ac'}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          <View style={[styles.heroSection, isWide && styles.heroSectionWide]}>
            <View style={styles.heroLeft}>
              <ThemedText type="title" style={styles.heroTitle}>
                Kendi tarzınızı yansıtan içerikler oluşturun.
              </ThemedText>
              <ThemedText style={styles.heroDesc}>
                Yüz ifadelerini değiştir, yaşını ayarla ve görüntülerini hayal ettiğin şekilde dönüştür.
              </ThemedText>
              <Pressable style={[styles.ctaBtn, { backgroundColor: Colors[colorScheme].tint }]} onPress={() => router.push('/create')}>
                <ThemedText style={styles.ctaBtnText}>Yaratmaya başlayın</ThemedText>
              </Pressable>
            </View>

            {isWide && (
              <View style={styles.heroRight}>
                {[0, 1, 2].map((idx) => (
                  <View key={`comparison-${idx}`} style={styles.imageComparisonCard}>
                    <View
                      style={[
                        styles.imagePlaceholder,
                        {
                          backgroundColor: imageStates[idx] === 0
                            ? isDark ? '#4A5A6A' : '#B8D8FF'
                            : isDark ? '#6A8A9A' : '#FFD4B8',
                        },
                      ]}>
                      <View style={styles.imageLabelBg}>
                        <ThemedText style={styles.imageLabel}>
                          {imageStates[idx] === 0 ? 'Orijinal' : 'İşlenmiş'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  topBar: {
    paddingTop: 56,
    paddingLeft: 16,
    paddingRight: 90,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  authActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,120,0.12)',
  },
  authButton: {
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(120,120,120,0.12)',
  },
  authButtonText: {
    maxWidth: 132,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 28,
  },
  heroSection: {
    paddingHorizontal: 56,
    paddingVertical: 42,
    gap: 14,
    alignItems: 'flex-start',
  },
  heroSectionWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  heroLeft: {
    flex: 1,
    gap: 12,
    maxWidth: 460,
  },
  heroRight: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
  },
  heroDesc: {
    fontSize: 18,
    lineHeight: 26,
    opacity: 0.8,
  },
  ctaBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    alignSelf: 'flex-start',
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  imageComparisonCard: {
    width: 275,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 325,
  },
  imageLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 325,
    borderRadius: 16,
  },
  imageLabelBg: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
