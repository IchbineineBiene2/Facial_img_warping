import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { SideNav } from '@/components/side-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [projectName, setProjectName] = useState('SRS Facial Transformer');
  const [autoSave, setAutoSave] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [minResolution, setMinResolution] = useState<'512' | '768' | '1024'>('512');
  const [landmarkModel, setLandmarkModel] = useState<'dlib68' | 'mediapipe468'>('mediapipe468');
  const [showLandmarkOverlay, setShowLandmarkOverlay] = useState(true);
  const [warpMode, setWarpMode] = useState<'fast' | 'balanced' | 'high'>('balanced');
  const [agingStrength, setAgingStrength] = useState('35');
  const [expressionSafetyLock, setExpressionSafetyLock] = useState(true);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState('92');
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000');
  const [backendEnabled, setBackendEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Ayarlar kaydedilmeyi bekliyor.');

  const inputTheme = useMemo(
    () => ({
      backgroundColor: isDark ? '#1F2428' : '#FFFFFF',
      borderColor: isDark ? '#32383B' : '#D7E0EA',
      color: colors.text,
    }),
    [colors.text, isDark],
  );

  const resetDefaults = () => {
    setProjectName('SRS Facial Transformer');
    setAutoSave(true);
    setShowGuides(true);
    setMinResolution('512');
    setLandmarkModel('mediapipe468');
    setShowLandmarkOverlay(true);
    setWarpMode('balanced');
    setAgingStrength('35');
    setExpressionSafetyLock(true);
    setExportFormat('png');
    setExportQuality('92');
    setApiBaseUrl('http://localhost:8000');
    setBackendEnabled(true);
    setStatusMessage('Varsayılan ayarlar geri yüklendi.');
  };

  const saveSettings = () => {
    setStatusMessage('Ayarlar uygulandı. Backend ve modüller bu profile göre çalışacak.');
  };

  return (
    <ThemedView style={styles.screen}>
      <SideNav />

      <View style={styles.mainContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <ThemedText type="title">Ayarlar</ThemedText>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#202426' : '#F3F7FC',
              borderColor: isDark ? '#32383B' : '#D7E0EA',
            },
          ]}>
          <ThemedText type="subtitle">Genel Proje Ayarları</ThemedText>
          <ThemedText style={styles.helperText}>SRS akışını yöneten temel proje tercihleri.</ThemedText>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">Proje Profili</ThemedText>
            <TextInput
              value={projectName}
              onChangeText={setProjectName}
              style={[styles.textInput, inputTheme]}
              placeholder="Profil adı"
              placeholderTextColor={isDark ? '#98A2A9' : '#7A8791'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="defaultSemiBold">Otomatik Kayıt</ThemedText>
              <ThemedText style={styles.helperText}>İşlem adımlarını otomatik kaydet.</ThemedText>
            </View>
            <Switch value={autoSave} onValueChange={setAutoSave} trackColor={{ true: colors.tint }} />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="defaultSemiBold">İpucu Katmanı</ThemedText>
              <ThemedText style={styles.helperText}>Adım adım yönlendirmeleri göster.</ThemedText>
            </View>
            <Switch value={showGuides} onValueChange={setShowGuides} trackColor={{ true: colors.tint }} />
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#202426' : '#F3F7FC',
              borderColor: isDark ? '#32383B' : '#D7E0EA',
            },
          ]}>
          <ThemedText type="subtitle">Ön İşleme ve Landmark</ThemedText>
          <ThemedText style={styles.helperText}>Girdi doğrulama, çözünürlük ve landmark çıkarımı.</ThemedText>

          <ThemedText type="defaultSemiBold">Minimum Çözünürlük</ThemedText>
          <View style={styles.choiceRow}>
            {(['512', '768', '1024'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setMinResolution(value)}
                style={[
                  styles.choicePill,
                  {
                    borderColor: value === minResolution ? colors.tint : inputTheme.borderColor,
                    backgroundColor: value === minResolution ? `${colors.tint}22` : inputTheme.backgroundColor,
                  },
                ]}>
                <ThemedText style={styles.choiceText}>{value}x{value}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="defaultSemiBold">Landmark Modeli</ThemedText>
          <View style={styles.choiceRow}>
            <Pressable
              onPress={() => setLandmarkModel('dlib68')}
              style={[
                styles.choicePill,
                {
                  borderColor: landmarkModel === 'dlib68' ? colors.tint : inputTheme.borderColor,
                  backgroundColor: landmarkModel === 'dlib68' ? `${colors.tint}22` : inputTheme.backgroundColor,
                },
              ]}>
              <ThemedText style={styles.choiceText}>Dlib 68 Nokta</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setLandmarkModel('mediapipe468')}
              style={[
                styles.choicePill,
                {
                  borderColor: landmarkModel === 'mediapipe468' ? colors.tint : inputTheme.borderColor,
                  backgroundColor: landmarkModel === 'mediapipe468' ? `${colors.tint}22` : inputTheme.backgroundColor,
                },
              ]}>
              <ThemedText style={styles.choiceText}>MediaPipe 468 Nokta</ThemedText>
            </Pressable>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="defaultSemiBold">Landmark Örtüsünü Göster</ThemedText>
              <ThemedText style={styles.helperText}>Önizlemede nokta ve bağlantıları çiz.</ThemedText>
            </View>
            <Switch
              value={showLandmarkOverlay}
              onValueChange={setShowLandmarkOverlay}
              trackColor={{ true: colors.tint }}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#202426' : '#F3F7FC',
              borderColor: isDark ? '#32383B' : '#D7E0EA',
            },
          ]}>
          <ThemedText type="subtitle">Dönüşüm ve Çıktı</ThemedText>
          <ThemedText style={styles.helperText}>Warp, ifade güvenliği, yaşlandırma ve export tercihleri.</ThemedText>

          <ThemedText type="defaultSemiBold">Warp Kalitesi</ThemedText>
          <View style={styles.choiceRow}>
            {([
              { label: 'Hızlı', value: 'fast' },
              { label: 'Dengeli', value: 'balanced' },
              { label: 'Yüksek', value: 'high' },
            ] as const).map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setWarpMode(item.value)}
                style={[
                  styles.choicePill,
                  {
                    borderColor: warpMode === item.value ? colors.tint : inputTheme.borderColor,
                    backgroundColor: warpMode === item.value ? `${colors.tint}22` : inputTheme.backgroundColor,
                  },
                ]}>
                <ThemedText style={styles.choiceText}>{item.label}</ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.inlineFieldRow}>
            <View style={styles.inlineField}>
              <ThemedText type="defaultSemiBold">Yaşlandırma Gücü (0-100)</ThemedText>
              <TextInput
                value={agingStrength}
                onChangeText={setAgingStrength}
                keyboardType="numeric"
                style={[styles.textInput, inputTheme]}
                placeholder="35"
                placeholderTextColor={isDark ? '#98A2A9' : '#7A8791'}
              />
            </View>

            <View style={styles.inlineField}>
              <ThemedText type="defaultSemiBold">Export Kalitesi (0-100)</ThemedText>
              <TextInput
                value={exportQuality}
                onChangeText={setExportQuality}
                keyboardType="numeric"
                style={[styles.textInput, inputTheme]}
                placeholder="92"
                placeholderTextColor={isDark ? '#98A2A9' : '#7A8791'}
              />
            </View>
          </View>

          <ThemedText type="defaultSemiBold">Çıktı Formatı</ThemedText>
          <View style={styles.choiceRow}>
            {(['png', 'jpg', 'webp'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setExportFormat(value)}
                style={[
                  styles.choicePill,
                  {
                    borderColor: exportFormat === value ? colors.tint : inputTheme.borderColor,
                    backgroundColor: exportFormat === value ? `${colors.tint}22` : inputTheme.backgroundColor,
                  },
                ]}>
                <ThemedText style={styles.choiceText}>{value.toUpperCase()}</ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="defaultSemiBold">İfade Güvenlik Kilidi</ThemedText>
              <ThemedText style={styles.helperText}>Aşırı deformasyonu sınırla.</ThemedText>
            </View>
            <Switch
              value={expressionSafetyLock}
              onValueChange={setExpressionSafetyLock}
              trackColor={{ true: colors.tint }}
            />
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#202426' : '#F3F7FC',
              borderColor: isDark ? '#32383B' : '#D7E0EA',
            },
          ]}>
          <ThemedText type="subtitle">Backend ve Servis</ThemedText>
          <ThemedText style={styles.helperText}>API bağlantısı ve çalışma modu ayarları.</ThemedText>

          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <ThemedText type="defaultSemiBold">Backend Entegrasyonu</ThemedText>
              <ThemedText style={styles.helperText}>Açıkken tüm işlemler API üzerinden çağrılır.</ThemedText>
            </View>
            <Switch value={backendEnabled} onValueChange={setBackendEnabled} trackColor={{ true: colors.tint }} />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="defaultSemiBold">API Base URL</ThemedText>
            <TextInput
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              style={[styles.textInput, inputTheme]}
              placeholder="http://localhost:8000"
              placeholderTextColor={isDark ? '#98A2A9' : '#7A8791'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.actionButton, styles.ghostButton, { borderColor: inputTheme.borderColor }]} onPress={resetDefaults}>
            <ThemedText type="defaultSemiBold">Varsayılanlara Dön</ThemedText>
          </Pressable>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.tint }]} onPress={saveSettings}>
            <ThemedText style={styles.actionPrimaryText}>Ayarları Uygula</ThemedText>
          </Pressable>
        </View>

        <View style={styles.statusRow}>
          <Ionicons name="information-circle-outline" size={18} color={colors.text} />
          <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
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
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  helperText: {
    opacity: 0.8,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choicePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  inlineFieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineField: {
    flex: 1,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  statusText: {
    flex: 1,
    opacity: 0.9,
  },
});
