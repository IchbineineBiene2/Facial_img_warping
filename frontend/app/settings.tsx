import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { STUDIO, StudioScreen } from '@/components/studio-shell';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.segment, !isDark ? styles.segmentLight : null]}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[styles.segmentItem, value === option.value ? styles.segmentItemActive : null]}>
          <ThemedText style={[styles.segmentText, !isDark ? styles.segmentTextLight : null, value === option.value ? styles.segmentTextActive : null]}>
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const [projectName, setProjectName] = useState('FaceMorph Pro');
  const [cloudBackup, setCloudBackup] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [quality, setQuality] = useState<'fast' | 'fhd' | 'ultra'>('fhd');
  const [format, setFormat] = useState<'png' | 'jpg' | 'webp'>('webp');
  const [resolution, setResolution] = useState<'1080p' | '2k' | '4k'>('2k');

  return (
    <StudioScreen>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Ionicons name="settings-outline" size={30} color="#C084FC" />
          </View>
          <View>
            <ThemedText style={[styles.title, !isDark ? styles.titleLight : null]}>Ayarlar</ThemedText>
            <ThemedText style={[styles.subtitle, !isDark ? styles.subtitleLight : null]}>Uygulama deneyiminizi kişiselleştirin ve sistem performansını yönetin.</ThemedText>
          </View>
        </View>

        <View style={[styles.sectionBanner, !isDark ? styles.sectionBannerLight : null]}>
          <ThemedText style={[styles.sectionTitle, !isDark ? styles.sectionTitleLight : null]}>GENEL PROJE AYARLARI</ThemedText>
          <ThemedText style={[styles.sectionDesc, !isDark ? styles.subtitleLight : null]}>Sistem akışını yöneten temel tercihler.</ThemedText>
        </View>

        <View style={styles.settingsGrid}>
          <View style={styles.field}>
            <ThemedText style={[styles.label, !isDark ? styles.labelLight : null]}>UYGULAMA ADI</ThemedText>
            <TextInput value={projectName} onChangeText={setProjectName} style={[styles.input, !isDark ? styles.inputLight : null]} />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, !isDark ? styles.labelLight : null]}>BULUTA YEDEKLE</ThemedText>
            <Switch
              value={cloudBackup}
              onValueChange={setCloudBackup}
              trackColor={{ false: 'rgba(255,255,255,0.14)', true: STUDIO.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, !isDark ? styles.labelLight : null]}>GELİŞMİŞ İPUÇLARI</ThemedText>
            <Switch
              value={showGuides}
              onValueChange={setShowGuides}
              trackColor={{ false: 'rgba(255,255,255,0.14)', true: STUDIO.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={[styles.sectionBanner, !isDark ? styles.sectionBannerLight : null]}>
          <ThemedText style={[styles.sectionTitle, !isDark ? styles.sectionTitleLight : null]}>DÖNÜŞÜM PARAMETRELERİ</ThemedText>
          <ThemedText style={[styles.sectionDesc, !isDark ? styles.subtitleLight : null]}>Warp, kalite ve çıktı formatı ayarları.</ThemedText>
        </View>

        <View style={styles.settingsGrid}>
          <View style={styles.fieldWide}>
            <ThemedText style={[styles.label, !isDark ? styles.labelLight : null]}>İŞLEM KALİTESİ</ThemedText>
            <Segment
              value={quality}
              onChange={setQuality}
              options={[
                { label: 'HIZLI', value: 'fast' },
                { label: 'FHD', value: 'fhd' },
                { label: 'ULTRA', value: 'ultra' },
              ]}
            />
          </View>

          <View style={styles.fieldWide}>
            <ThemedText style={[styles.label, !isDark ? styles.labelLight : null]}>ÇIKTI FORMATI</ThemedText>
            <Segment
              value={format}
              onChange={setFormat}
              options={[
                { label: 'PNG', value: 'png' },
                { label: 'JPG', value: 'jpg' },
                { label: 'WEBP', value: 'webp' },
              ]}
            />
          </View>

          <View style={styles.fieldWide}>
            <ThemedText style={[styles.label, !isDark ? styles.labelLight : null]}>MAKSİMUM ÇÖZÜNÜRLÜK</ThemedText>
            <Segment
              value={resolution}
              onChange={setResolution}
              options={[
                { label: '1080P', value: '1080p' },
                { label: '2K', value: '2k' },
                { label: '4K', value: '4k' },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </StudioScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 242,
    paddingTop: 48,
    paddingBottom: 90,
    gap: 34,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 28,
  },
  titleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.22)',
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
  sectionBanner: {
    borderLeftWidth: 4,
    borderLeftColor: STUDIO.accent,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  sectionBannerLight: {
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionTitleLight: {
    color: STUDIO.lightText,
  },
  sectionDesc: {
    color: '#7584A3',
    fontSize: 14,
    fontWeight: '700',
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 48,
    rowGap: 34,
  },
  field: {
    width: '45%',
    minWidth: 260,
    gap: 12,
  },
  fieldWide: {
    width: '45%',
    minWidth: 376,
    gap: 12,
  },
  label: {
    color: '#52627D',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  labelLight: {
    color: '#64748B',
  },
  input: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    color: '#FFFFFF',
    paddingHorizontal: 18,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  inputLight: {
    borderColor: STUDIO.lightBorder,
    color: STUDIO.lightText,
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  segment: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    padding: 4,
  },
  segmentLight: {
    borderColor: STUDIO.lightBorder,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  segmentItem: {
    flex: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: STUDIO.accent,
  },
  segmentText: {
    color: '#7584A3',
    fontSize: 11,
    fontWeight: '900',
  },
  segmentTextLight: {
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
});
