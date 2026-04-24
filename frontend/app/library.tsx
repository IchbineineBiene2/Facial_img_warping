import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { STUDIO, StudioCard, StudioScreen } from '@/components/studio-shell';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ITEMS = [
  { title: 'Gece Portresi', type: 'MORFING', date: '2 saat önce' },
  { title: 'Profil Yenileme', type: 'DEFORMASYON', date: 'Dün' },
  { title: 'Avatar Denemesi', type: 'YAŞLANDIRMA', date: '3 gün önce' },
  { title: 'Sanatsal Çekim', type: 'MORFING', date: '1 hafta önce' },
];

export default function LibraryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  return (
    <StudioScreen>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <ThemedText style={[styles.title, !isDark ? styles.titleLight : null]}>Kütüphane</ThemedText>
            <ThemedText style={[styles.subtitle, !isDark ? styles.subtitleLight : null]}>Kaydettiğiniz tüm çalışmaları buradan yönetin.</ThemedText>
          </View>
          <View style={styles.filters}>
            {['TÜMÜ', 'MORFING', 'FİLTRELER', 'FAVORİLER'].map((filter, index) => (
              <Pressable key={filter} style={[styles.filterPill, !isDark ? styles.filterPillLight : null, index === 0 ? styles.filterPillActive : null]}>
                <ThemedText style={[styles.filterText, index === 0 ? styles.filterTextActive : null]}>{filter}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.grid}>
          {ITEMS.map((item, index) => (
            <StudioCard key={item.title} style={styles.itemCard}>
              <View style={[styles.thumb, !isDark ? styles.thumbLight : null]}>
                <Ionicons name="image-outline" size={46} color="rgba(255,255,255,0.18)" />
                {index === 0 ? (
                  <View style={styles.thumbActions}>
                    <Pressable style={styles.inspectButton}>
                      <ThemedText style={styles.inspectText}>İncele</ThemedText>
                    </Pressable>
                    <Pressable style={styles.downloadButton}>
                      <Ionicons name="download-outline" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : null}
              </View>
              <View style={styles.itemMeta}>
                <ThemedText style={[styles.itemTitle, !isDark ? styles.itemTitleLight : null]}>{item.title}</ThemedText>
                <View style={styles.itemFooter}>
                  <ThemedText style={styles.itemType}>{item.type}</ThemedText>
                  <ThemedText style={styles.itemDate}>{item.date}</ThemedText>
                </View>
              </View>
            </StudioCard>
          ))}

          <Pressable style={[styles.newCard, !isDark ? styles.newCardLight : null]} onPress={() => router.push('/create')}>
            <View style={styles.newIcon}>
              <Ionicons name="add-circle-outline" size={26} color="#C084FC" />
            </View>
            <ThemedText style={styles.newText}>YENİ OLUŞTUR</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </StudioScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 56,
    paddingTop: 42,
    paddingBottom: 64,
    gap: 38,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  title: {
    color: STUDIO.text,
    fontSize: 50,
    lineHeight: 56,
    fontWeight: '900',
  },
  titleLight: {
    color: STUDIO.lightText,
  },
  subtitle: {
    color: '#7584A3',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitleLight: {
    color: STUDIO.lightMuted,
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterPill: {
    height: 36,
    minWidth: 96,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  filterPillLight: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  filterPillActive: {
    backgroundColor: STUDIO.accent,
  },
  filterText: {
    color: '#8EA0C0',
    fontSize: 12,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  itemCard: {
    width: 278,
    height: 333,
    padding: 16,
    borderRadius: 38,
    justifyContent: 'space-between',
  },
  thumb: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbLight: {
    backgroundColor: 'rgba(15,23,42,0.05)',
  },
  thumbActions: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    gap: 8,
  },
  inspectButton: {
    flex: 1,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  inspectText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '900',
  },
  downloadButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  itemMeta: {
    paddingHorizontal: 8,
    paddingTop: 16,
    gap: 8,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  itemTitleLight: {
    color: STUDIO.lightText,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemType: {
    color: '#B225FF',
    fontSize: 10,
    fontWeight: '900',
  },
  itemDate: {
    color: '#7180A0',
    fontSize: 10,
    fontWeight: '700',
  },
  newCard: {
    width: 278,
    height: 84,
    borderRadius: 38,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  newCardLight: {
    borderColor: 'rgba(15,23,42,0.16)',
  },
  newIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.16)',
  },
  newText: {
    color: '#7180A0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
