import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

import { SideNav } from '@/components/side-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { frequencyFromBase64, landmarksFromBase64, preprocessFromUri, warpFromBase64 } from '@/services/facial-api';
import { Ionicons } from '@expo/vector-icons';

const MIN_WIDTH = 512;
const MIN_HEIGHT = 512;
const MIN_CROP_SIZE = 24;

type ProcessState = 'idle' | 'selected' | 'error';

type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type StageLayout = {
  width: number;
  height: number;
};

type ContainLayout = {
  scale: number;
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getContainLayout = (stage: StageLayout, imageSize: { width: number; height: number }): ContainLayout => {
  const scale = Math.min(stage.width / imageSize.width, stage.height / imageSize.height);
  const renderWidth = imageSize.width * scale;
  const renderHeight = imageSize.height * scale;

  return {
    scale,
    renderWidth,
    renderHeight,
    offsetX: (stage.width - renderWidth) / 2,
    offsetY: (stage.height - renderHeight) / 2,
  };
};

const createInitialCropBox = (stage: StageLayout, imageSize: { width: number; height: number }): CropBox => {
  const contain = getContainLayout(stage, imageSize);
  const cropWidth = clamp(contain.renderWidth * 0.5, MIN_CROP_SIZE, contain.renderWidth);
  const cropHeight = clamp(contain.renderHeight * 0.5, MIN_CROP_SIZE, contain.renderHeight);

  return {
    x: contain.offsetX + (contain.renderWidth - cropWidth) / 2,
    y: contain.offsetY + (contain.renderHeight - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };
};

const clampCropBox = (box: CropBox, stage: StageLayout, imageSize: { width: number; height: number }) => {
  const contain = getContainLayout(stage, imageSize);
  const cropWidth = clamp(box.width, MIN_CROP_SIZE, contain.renderWidth);
  const cropHeight = clamp(box.height, MIN_CROP_SIZE, contain.renderHeight);
  const x = clamp(box.x, contain.offsetX, contain.offsetX + contain.renderWidth - cropWidth);
  const y = clamp(box.y, contain.offsetY, contain.offsetY + contain.renderHeight - cropHeight);

  return { x, y, width: cropWidth, height: cropHeight };
};

export default function CreateScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  // In dark mode tint is #fff — text on tint buttons must be dark to be visible
  const tintTextColor = colorScheme === 'dark' ? '#11181C' : '#FFFFFF';
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageSize, setSelectedImageSize] = useState<{ width: number; height: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Henüz görsel seçilmedi.');
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [cropApplied, setCropApplied] = useState(false);
  const [cropEditorVisible, setCropEditorVisible] = useState(false);
  const [cropStageLayout, setCropStageLayout] = useState<StageLayout | null>(null);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const cropBoxRef = useRef<CropBox | null>(null);
  const dragStartRef = useRef<CropBox | null>(null);
  const resizeStartRef = useRef<CropBox | null>(null);

  // CV pipeline state
  const [preprocessLoading, setPreprocessLoading] = useState(false);
  const [preprocessError, setPreprocessError] = useState<string | null>(null);
  const [preprocessedB64, setPreprocessedB64] = useState<string | null>(null);

  const [landmarkLoading, setLandmarkLoading] = useState(false);
  const [landmarkError, setLandmarkError] = useState<string | null>(null);
  const [landmarkB64, setLandmarkB64] = useState<string | null>(null);
  const [landmarkCount, setLandmarkCount] = useState<number | null>(null);
  const [showLandmarks, setShowLandmarks] = useState(false);

  const [warpOp, setWarpOp] = useState<'smile' | 'raise_eyebrows' | 'widen_lips' | 'slim_face'>('smile');
  const [warpIntensity, setWarpIntensity] = useState(0.8);
  const [warpLoading, setWarpLoading] = useState(false);
  const [warpError, setWarpError] = useState<string | null>(null);
  const [warpResultB64, setWarpResultB64] = useState<string | null>(null);

  const [agingIntensity, setAgingIntensity] = useState(0.8);
  const [agingLoading, setAgingLoading] = useState(false);
  const [agingError, setAgingError] = useState<string | null>(null);
  const [agingResultB64, setAgingResultB64] = useState<string | null>(null);
  const [agingMode, setAgingMode] = useState<'aging' | 'deaging'>('aging');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  useEffect(() => {
    cropBoxRef.current = cropBox;
  }, [cropBox]);

  useEffect(() => {
    if (cropEditorVisible && cropStageLayout && selectedImageSize && !cropBoxRef.current) {
      ensureCropBox(cropStageLayout);
    }
  }, [cropEditorVisible, cropStageLayout, selectedImageSize]);

  const updateCropBox = (nextBox: CropBox | null) => {
    cropBoxRef.current = nextBox;
    setCropBox(nextBox);
  };

  const closeCropEditor = () => {
    setCropEditorVisible(false);
    setCropStageLayout(null);
    updateCropBox(null);
  };

  const ensureCropBox = (stage: StageLayout) => {
    if (!selectedImageSize) {
      return;
    }

    updateCropBox(createInitialCropBox(stage, selectedImageSize));
  };

  const openCropEditor = () => {
    if (!selectedImageUri || !selectedImageSize) {
      setProcessState('error');
      setStatusMessage('Kırpma için önce bir görsel seçmelisin.');
      return;
    }

    setCropEditorVisible(true);
    setStatusMessage('Kırpma alanını sürükle ya da köşeden büyüt/küçült.');
  };

  const moveCropResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          dragStartRef.current = cropBoxRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          if (!dragStartRef.current || !cropStageLayout || !selectedImageSize) {
            return;
          }

          const nextBox = clampCropBox(
            {
              x: dragStartRef.current.x + gestureState.dx,
              y: dragStartRef.current.y + gestureState.dy,
              width: dragStartRef.current.width,
              height: dragStartRef.current.height,
            },
            cropStageLayout,
            selectedImageSize
          );

          updateCropBox(nextBox);
        },
        onPanResponderRelease: () => {
          dragStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          dragStartRef.current = null;
        },
      }),
    [cropStageLayout, selectedImageSize]
  );

  const createResizeResponder = useMemo(
    () => (mode: 'x' | 'y' | 'xy') =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          resizeStartRef.current = cropBoxRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          if (!resizeStartRef.current || !cropStageLayout || !selectedImageSize) {
            return;
          }

          const contain = getContainLayout(cropStageLayout, selectedImageSize);
          const startBox = resizeStartRef.current;
          const maxWidth = contain.offsetX + contain.renderWidth - startBox.x;
          const maxHeight = contain.offsetY + contain.renderHeight - startBox.y;

          const nextWidth =
            mode === 'y' ? startBox.width : clamp(startBox.width + gestureState.dx, MIN_CROP_SIZE, maxWidth);
          const nextHeight =
            mode === 'x' ? startBox.height : clamp(startBox.height + gestureState.dy, MIN_CROP_SIZE, maxHeight);

          updateCropBox(
            clampCropBox(
              {
                x: startBox.x,
                y: startBox.y,
                width: nextWidth,
                height: nextHeight,
              },
              cropStageLayout,
              selectedImageSize
            )
          );
        },
        onPanResponderRelease: () => {
          resizeStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          resizeStartRef.current = null;
        },
      }),
    [cropStageLayout, selectedImageSize]
  );

  const resizeRightResponder = useMemo(() => createResizeResponder('x'), [createResizeResponder]);
  const resizeBottomResponder = useMemo(() => createResizeResponder('y'), [createResizeResponder]);
  const resizeCornerResponder = useMemo(() => createResizeResponder('xy'), [createResizeResponder]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      selectionLimit: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const rawName = asset.fileName ?? asset.uri.split('/').pop() ?? 'secilen_gorsel';
    const mimeType = (asset.mimeType ?? '').toLowerCase();
    const isImageMime = mimeType === '' || mimeType.startsWith('image/');

    if (!isImageMime) {
      setSelectedImageName(null);
      setSelectedImageUri(null);
      setSelectedImageSize(null);
      setProcessState('error');
      setStatusMessage('Lütfen geçerli bir görsel dosyası seçin.');
      return;
    }

    if ((asset.width ?? 0) < MIN_WIDTH || (asset.height ?? 0) < MIN_HEIGHT) {
      setSelectedImageName(null);
      setSelectedImageUri(null);
      setSelectedImageSize(null);
      setProcessState('error');
      setStatusMessage(`Minimum çözünürlük ${MIN_WIDTH}x${MIN_HEIGHT} olmalı. Seçilen: ${asset.width}x${asset.height}.`);
      return;
    }

    setSelectedImageName(rawName);
    setSelectedImageUri(asset.uri);
    setSelectedImageSize({ width: asset.width ?? MIN_WIDTH, height: asset.height ?? MIN_HEIGHT });
    setProcessState('selected');
    setStatusMessage(`Seçilen görsel hazır: ${asset.width}x${asset.height}.`);
    setCropApplied(false);
    closeCropEditor();
  };

  const cropImage = async () => {
    if (!selectedImageUri) {
      setProcessState('error');
      setStatusMessage('Kırpma için önce bir görsel seçmelisin.');
      return;
    }

    openCropEditor();
  };

  const applyCrop = async () => {
    if (!selectedImageUri || !selectedImageSize || !cropStageLayout || !cropBox) {
      setProcessState('error');
      setStatusMessage('Kırpma alanı hazırlanamadı. Önce görseli aç ve alanı seç.');
      return;
    }

    const contain = getContainLayout(cropStageLayout, selectedImageSize);
    const originX = clamp((cropBox.x - contain.offsetX) / contain.scale, 0, selectedImageSize.width);
    const originY = clamp((cropBox.y - contain.offsetY) / contain.scale, 0, selectedImageSize.height);
    const cropWidth = clamp(cropBox.width / contain.scale, 1, selectedImageSize.width - originX);
    const cropHeight = clamp(cropBox.height / contain.scale, 1, selectedImageSize.height - originY);

    try {
      const result = await ImageManipulator.manipulateAsync(
        selectedImageUri,
        [
          {
            crop: {
              originX: Math.round(originX),
              originY: Math.round(originY),
              width: Math.round(cropWidth),
              height: Math.round(cropHeight),
            },
          },
        ],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );

      setSelectedImageUri(result.uri);
      setSelectedImageSize({ width: result.width ?? Math.round(cropWidth), height: result.height ?? Math.round(cropHeight) });
      setCropApplied(true);
      setProcessState('selected');
      setStatusMessage('Kırpma uygulandı. Görsel artık seçtiğin kadrajla hazır.');
      closeCropEditor();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kırpma uygulanamadı.';
      setProcessState('error');
      setStatusMessage(message);
    }
  };

  const handlePreprocess = async () => {
    if (!selectedImageUri) return;
    setPreprocessLoading(true);
    setPreprocessError(null);
    setPreprocessedB64(null);
    setLandmarkB64(null);
    setLandmarkCount(null);
    setWarpResultB64(null);
    setAgingResultB64(null);
    try {
      const data = await preprocessFromUri(selectedImageUri);
      if (!data.success) throw new Error(data.message ?? 'Preprocess failed');
      setPreprocessedB64(data.processed_image_b64);
    } catch (e: any) {
      setPreprocessError(e?.message ?? 'Unknown error');
    } finally {
      setPreprocessLoading(false);
    }
  };

  const handleLandmarks = async () => {
    if (!preprocessedB64) return;
    setLandmarkLoading(true);
    setLandmarkError(null);
    try {
      const data = await landmarksFromBase64(preprocessedB64);
      if (!data.success) throw new Error(data.message ?? 'Landmark detection failed');
      setLandmarkB64(data.landmark_image_b64);
      setLandmarkCount(data.landmark_count);
    } catch (e: any) {
      setLandmarkError(e?.message ?? 'Unknown error');
    } finally {
      setLandmarkLoading(false);
    }
  };

  const handleWarp = async () => {
    if (!preprocessedB64 || !landmarkCount) return;
    setWarpLoading(true);
    setWarpError(null);
    setWarpResultB64(null);
    try {
      const data = await warpFromBase64(preprocessedB64, warpOp, warpIntensity);
      if (!data.success) throw new Error(data.message ?? 'Warp failed');
      setWarpResultB64(data.result_image_b64);
    } catch (e: any) {
      setWarpError(e?.message ?? 'Unknown error');
    } finally {
      setWarpLoading(false);
    }
  };

  const handleAging = async (mode: 'aging' | 'deaging') => {
    if (!preprocessedB64) return;
    setAgingMode(mode);
    setAgingLoading(true);
    setAgingError(null);
    setAgingResultB64(null);
    try {
      const data = await frequencyFromBase64(preprocessedB64, mode, agingIntensity);
      if (!data.success) throw new Error(data.message ?? 'Frequency effect failed');
      setAgingResultB64(data.result_image_b64);
    } catch (e: any) {
      setAgingError(e?.message ?? 'Unknown error');
    } finally {
      setAgingLoading(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SideNav />

      <View style={styles.mainContent}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <ThemedText type="title">Oluştur</ThemedText>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.workspace, isWide && styles.workspaceWide]}>
          <View
            style={[
              styles.panel,
              styles.uploadPanel,
              {
                backgroundColor: colorScheme === 'dark' ? '#202426' : '#F3F7FC',
                borderColor: colorScheme === 'dark' ? '#32383B' : '#D7E0EA',
              },
            ]}>
            <ThemedText type="subtitle">Fotoğraf Yükle</ThemedText>
            <ThemedText style={styles.helperText}>
              Fotoğrafını seçip merkez önizlemede kırpma işlemini yapabilirsin.
            </ThemedText>

            <Pressable style={[styles.uploadButton, { backgroundColor: Colors[colorScheme].tint }]} onPress={pickImage}>
              <Ionicons name="image-outline" size={18} color={tintTextColor} />
              <ThemedText style={[styles.uploadButtonText, { color: tintTextColor }]}>Görsel Seç</ThemedText>
            </Pressable>

            <View style={styles.statusRow}>
              <Ionicons
                name={processState === 'error' ? 'alert-circle-outline' : 'information-circle-outline'}
                size={18}
                color={colors.text}
              />
              <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
            </View>

            {selectedImageName ? (
              <View style={styles.fileCard}>
                <ThemedText type="defaultSemiBold">Seçilen Dosya</ThemedText>
                <ThemedText style={styles.fileText}>{selectedImageName}</ThemedText>
                <ThemedText style={styles.fileText}>
                  {selectedImageSize ? `${selectedImageSize.width} x ${selectedImageSize.height}` : 'Boyut bilinmiyor'}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.panel,
              styles.previewPanel,
              {
                backgroundColor: colorScheme === 'dark' ? '#181C1E' : '#FFFFFF',
                borderColor: colorScheme === 'dark' ? '#32383B' : '#D7E0EA',
              },
            ]}>
            <ThemedText type="subtitle">Orta Önizleme</ThemedText>
            {selectedImageUri ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: selectedImageUri }} style={styles.previewImage} contentFit="cover" />
                <View style={styles.previewBadge}>
                  <ThemedText style={styles.previewBadgeText}>Fotoğraf Ortada</ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <Ionicons name="image-outline" size={40} color={colors.text} />
                <ThemedText style={styles.helperText}>Fotoğraf seçince burada ortada görünecek.</ThemedText>
              </View>
            )}

            <View style={styles.previewActions}>
              <Pressable
                style={[
                  styles.iconActionButton,
                  { backgroundColor: colorScheme === 'dark' ? '#202426' : '#F3F7FC', borderColor: colors.tint },
                ]}
                onPress={cropImage}
                disabled={!selectedImageUri}>
                <Ionicons name="crop-outline" size={18} color={colors.tint} />
                <ThemedText style={[styles.iconActionText, { color: colors.tint }]}>Kırp</ThemedText>
              </Pressable>

              <View style={styles.cropHintPill}>
                <ThemedText style={styles.cropHintText}>{cropApplied ? 'Kırpma uygulandı' : 'Kırpma bekliyor'}</ThemedText>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.panel,
              styles.featurePanel,
              {
                backgroundColor: colorScheme === 'dark' ? '#202426' : '#F3F7FC',
                borderColor: colorScheme === 'dark' ? '#32383B' : '#D7E0EA',
              },
            ]}>
            <ThemedText type="subtitle">Özellikler</ThemedText>

            {/* Section 1: Preprocessing */}
            <ThemedText type="defaultSemiBold">1. Yüz Tespiti</ThemedText>
            <Pressable
              style={[styles.cvButton, { backgroundColor: Colors[colorScheme].tint, opacity: selectedImageUri ? 1 : 0.5 }]}
              onPress={handlePreprocess}
              disabled={!selectedImageUri || preprocessLoading}>
              {preprocessLoading
                ? <ActivityIndicator color={tintTextColor} />
                : <ThemedText style={[styles.cvButtonText, { color: tintTextColor }]}>Yüzü Tespit Et</ThemedText>}
            </Pressable>
            {preprocessError ? <Text style={styles.errorText}>{preprocessError}</Text> : null}
            {preprocessedB64 ? (
              <Pressable onPress={() => setLightboxUri(`data:image/png;base64,${preprocessedB64}`)}>
                <Image
                  source={{ uri: `data:image/png;base64,${preprocessedB64}` }}
                  style={styles.resultImage}
                  contentFit="contain"
                />
              </Pressable>
            ) : null}

            {/* Section 2: Landmarks */}
            <ThemedText type="defaultSemiBold">2. Yüz Noktaları</ThemedText>
            <Pressable
              style={[styles.cvButton, { backgroundColor: Colors[colorScheme].tint, opacity: preprocessedB64 ? 1 : 0.4 }]}
              onPress={handleLandmarks}
              disabled={!preprocessedB64 || landmarkLoading}>
              {landmarkLoading
                ? <ActivityIndicator color={tintTextColor} />
                : <ThemedText style={[styles.cvButtonText, { color: tintTextColor }]}>Noktaları Tespit Et</ThemedText>}
            </Pressable>
            {landmarkError ? <Text style={styles.errorText}>{landmarkError}</Text> : null}
            {landmarkCount != null ? (
              <View style={styles.landmarkRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.helperText}>{landmarkCount} nokta bulundu</ThemedText>
                  <ThemedText style={[styles.helperText, { fontSize: 11, opacity: 0.5 }]}>
                    Gözler, kaşlar, ağız, burun, çene ve alın noktaları
                  </ThemedText>
                </View>
                <Switch value={showLandmarks} onValueChange={setShowLandmarks} />
              </View>
            ) : null}
            {landmarkB64 && showLandmarks ? (
              <Pressable onPress={() => setLightboxUri(`data:image/png;base64,${landmarkB64}`)}>
                <Image
                  source={{ uri: `data:image/png;base64,${landmarkB64}` }}
                  style={styles.resultImage}
                  contentFit="contain"
                />
              </Pressable>
            ) : preprocessedB64 && landmarkCount != null && !showLandmarks ? (
              <Pressable onPress={() => setLightboxUri(`data:image/png;base64,${preprocessedB64}`)}>
                <Image
                  source={{ uri: `data:image/png;base64,${preprocessedB64}` }}
                  style={styles.resultImage}
                  contentFit="contain"
                />
              </Pressable>
            ) : null}

            {/* Section 3: Expression Warp */}
            <ThemedText type="defaultSemiBold">3. Yüz Deforme</ThemedText>
            <View style={styles.warpGrid}>
              {(['smile', 'raise_eyebrows', 'widen_lips', 'slim_face'] as const).map((op) => (
                <Pressable
                  key={op}
                  style={[
                    styles.warpOpButton,
                    {
                      backgroundColor: warpOp === op ? Colors[colorScheme].tint : 'rgba(120,120,120,0.15)',
                      opacity: landmarkCount ? 1 : 0.4,
                    },
                  ]}
                  onPress={() => setWarpOp(op)}
                  disabled={!landmarkCount}>
                  <ThemedText style={[styles.warpOpText, { color: warpOp === op ? tintTextColor : colors.text }]}>
                    {op === 'smile' ? 'Gülümse' : op === 'raise_eyebrows' ? 'Kaşları Kaldır' : op === 'widen_lips' ? 'Dudakları Genişlet' : 'İnce Yüz'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText style={styles.helperText}>Yoğunluk: {warpIntensity.toFixed(1)}</ThemedText>
            <View style={styles.sliderRow}>
              <Pressable onPress={() => setWarpIntensity(Math.max(0, +(warpIntensity - 0.1).toFixed(1)))} style={styles.sliderBtn} disabled={!landmarkCount}>
                <ThemedText>−</ThemedText>
              </Pressable>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${warpIntensity * 100}%`, backgroundColor: Colors[colorScheme].tint }]} />
              </View>
              <Pressable onPress={() => setWarpIntensity(Math.min(1, +(warpIntensity + 0.1).toFixed(1)))} style={styles.sliderBtn} disabled={!landmarkCount}>
                <ThemedText>+</ThemedText>
              </Pressable>
            </View>
            <Pressable
              style={[styles.cvButton, { backgroundColor: Colors[colorScheme].tint, opacity: landmarkCount ? 1 : 0.4 }]}
              onPress={handleWarp}
              disabled={!landmarkCount || warpLoading}>
              {warpLoading
                ? <ActivityIndicator color={tintTextColor} />
                : <ThemedText style={[styles.cvButtonText, { color: tintTextColor }]}>Deforme Uygula</ThemedText>}
            </Pressable>
            {warpError ? <Text style={styles.errorText}>{warpError}</Text> : null}
            {warpResultB64 && preprocessedB64 ? (
              <View style={styles.sideBySide}>
                <View style={styles.sideBox}>
                  <ThemedText style={styles.sideLabel}>Orijinal</ThemedText>
                  <Pressable onPress={() => setLightboxUri(`data:image/png;base64,${preprocessedB64}`)}>
                    <Image source={{ uri: `data:image/png;base64,${preprocessedB64}` }} style={styles.sideImage} contentFit="contain" />
                  </Pressable>
                </View>
                <View style={styles.sideBox}>
                  <ThemedText style={styles.sideLabel}>Sonuç</ThemedText>
                  <Pressable onPress={() => setLightboxUri(`data:image/png;base64,${warpResultB64}`)}>
                    <Image source={{ uri: `data:image/png;base64,${warpResultB64}` }} style={styles.sideImage} contentFit="contain" />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {/* Section 4: Aging Simulation */}
            <ThemedText type="defaultSemiBold">4. Yaşlandırma / Gençleştirme</ThemedText>
            <ThemedText style={styles.helperText}>Yoğunluk: {agingIntensity.toFixed(1)}</ThemedText>
            <View style={styles.sliderRow}>
              <Pressable onPress={() => setAgingIntensity(Math.max(0, +(agingIntensity - 0.1).toFixed(1)))} style={styles.sliderBtn} disabled={!selectedImageUri}>
                <ThemedText>−</ThemedText>
              </Pressable>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${agingIntensity * 100}%`, backgroundColor: Colors[colorScheme].tint }]} />
              </View>
              <Pressable onPress={() => setAgingIntensity(Math.min(1, +(agingIntensity + 0.1).toFixed(1)))} style={styles.sliderBtn} disabled={!selectedImageUri}>
                <ThemedText>+</ThemedText>
              </Pressable>
            </View>
            <View style={styles.agingRow}>
              <Pressable
                style={[styles.cvButton, { flex: 1, backgroundColor: Colors[colorScheme].tint, opacity: preprocessedB64 ? 1 : 0.4 }]}
                onPress={() => handleAging('aging')}
                disabled={!preprocessedB64 || agingLoading}>
                {agingLoading && agingMode === 'aging'
                  ? <ActivityIndicator color={tintTextColor} />
                  : <ThemedText style={[styles.cvButtonText, { color: tintTextColor }]}>Yaşlandır</ThemedText>}
              </Pressable>
              <Pressable
                style={[styles.cvButton, { flex: 1, backgroundColor: colors.text, opacity: preprocessedB64 ? 1 : 0.4 }]}
                onPress={() => handleAging('deaging')}
                disabled={!preprocessedB64 || agingLoading}>
                {agingLoading && agingMode === 'deaging'
                  ? <ActivityIndicator color={colorScheme === 'dark' ? '#000' : '#fff'} />
                  : <ThemedText style={[styles.cvButtonText, { color: colorScheme === 'dark' ? '#000' : '#fff' }]}>Gençleştir</ThemedText>}
              </Pressable>
            </View>
            {agingError ? <Text style={styles.errorText}>{agingError}</Text> : null}
            {agingResultB64 && preprocessedB64 ? (
              <View style={styles.sideBySide}>
                <View style={styles.sideBox}>
                  <ThemedText style={styles.sideLabel}>Orijinal</ThemedText>
                  <Pressable onPress={() => setLightboxUri(`data:image/png;base64,${preprocessedB64}`)}>
                    <Image source={{ uri: `data:image/png;base64,${preprocessedB64}` }} style={styles.sideImage} contentFit="contain" />
                  </Pressable>
                </View>
                <View style={styles.sideBox}>
                  <ThemedText style={styles.sideLabel}>Sonuç</ThemedText>
                  <Pressable onPress={() => setLightboxUri(`data:image/png;base64,${agingResultB64}`)}>
                    <Image source={{ uri: `data:image/png;base64,${agingResultB64}` }} style={styles.sideImage} contentFit="contain" />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
      </View>

      <Modal visible={!!lightboxUri} animationType="fade" transparent onRequestClose={() => setLightboxUri(null)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxUri(null)}>
          {lightboxUri ? (
            <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} contentFit="contain" />
          ) : null}
          <Pressable style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={cropEditorVisible} animationType="slide" transparent onRequestClose={closeCropEditor}>
        <View style={styles.cropModalBackdrop}>
          <ScrollView
            style={styles.cropModalScroll}
            contentContainerStyle={styles.cropModalScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View
              style={[
                styles.cropModalCard,
                {
                  backgroundColor: colorScheme === 'dark' ? '#181C1E' : '#FFFFFF',
                  borderColor: colorScheme === 'dark' ? '#32383B' : '#D7E0EA',
                },
              ]}>
              <View style={styles.cropModalHeader}>
                <Pressable onPress={closeCropEditor} style={styles.cropModalHeaderButton}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>

                <ThemedText type="subtitle">Kırpma Alanı</ThemedText>

                <Pressable
                  onPress={applyCrop}
                  style={[styles.cropApplyButton, { backgroundColor: Colors[colorScheme].tint }]}
                  disabled={!cropBox}>
                  <ThemedText style={styles.cropApplyButtonText}>Uygula</ThemedText>
                </Pressable>
              </View>

              <View
                style={styles.cropStage}
                onLayout={(event) => {
                  const { width: stageWidth, height: stageHeight } = event.nativeEvent.layout;
                  const nextLayout = { width: stageWidth, height: stageHeight };
                  setCropStageLayout(nextLayout);
                  if (!cropBoxRef.current && selectedImageSize) {
                    updateCropBox(createInitialCropBox(nextLayout, selectedImageSize));
                  }
                }}>
                {selectedImageUri ? <Image source={{ uri: selectedImageUri }} style={styles.cropStageImage} contentFit="contain" /> : null}

                {cropBox && cropStageLayout && selectedImageSize ? (
                  <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
                    <View
                      style={[
                        styles.cropBoxFrame,
                        {
                          left: cropBox.x,
                          top: cropBox.y,
                          width: cropBox.width,
                          height: cropBox.height,
                        },
                      ]}
                      {...moveCropResponder.panHandlers}>
                      <View style={styles.cropBoxShade} />
                      <View style={styles.cropBoxInnerBorder} />
                    <View style={styles.cropRightHandle} {...resizeRightResponder.panHandlers} />
                    <View style={styles.cropBottomHandle} {...resizeBottomResponder.panHandlers} />
                    <View style={styles.cropCornerHandle} {...resizeCornerResponder.panHandlers} />
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={styles.cropModalFooter}>
                <ThemedText style={styles.helperText}>
                  Alanı sürükleyerek konumlandırabilir, sağ tutamactan genişliği, alt tutamactan yüksekliği değiştirebilirsin.
                </ThemedText>
                <ThemedText style={styles.helperText}>
                  Köşe tutamaci ile her iki boyutu birden ayarlayabilirsin; alan kare olmak zorunda degil.
                </ThemedText>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  workspace: {
    gap: 14,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 1240,
  },
  workspaceWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  panel: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  uploadPanel: {
    flex: 1,
    minWidth: 240,
  },
  previewPanel: {
    flex: 1.3,
    minWidth: 320,
    alignItems: 'center',
  },
  featurePanel: {
    flex: 1,
    minWidth: 240,
  },
  helperText: {
    opacity: 0.8,
    lineHeight: 21,
  },
  uploadButton: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  statusText: {
    flex: 1,
    flexWrap: 'wrap',
    opacity: 0.9,
  },
  fileCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(120,120,120,0.08)',
    gap: 4,
  },
  fileText: {
    opacity: 0.8,
  },
  previewBox: {
    width: '100%',
    maxWidth: 560,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.18)',
    alignSelf: 'center',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyPreview: {
    width: '100%',
    maxWidth: 560,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(120,120,120,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  iconActionButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cropHintPill: {
    flexShrink: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(120,120,120,0.12)',
  },
  cropHintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyFeatureSpace: {
    flex: 1,
    minHeight: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(120,120,120,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cropModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  cropModalScroll: {
    flex: 1,
  },
  cropModalScrollContent: {
    padding: 16,
    minHeight: '100%',
    justifyContent: 'center',
  },
  cropModalCard: {
    width: '100%',
    maxWidth: 760,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
    maxHeight: '96%',
  },
  cropModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120,120,120,0.18)',
  },
  cropModalHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,120,0.12)',
  },
  cropApplyButton: {
    minWidth: 88,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  cropApplyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  cropStage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#101214',
    position: 'relative',
  },
  cropStageImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cropBoxFrame: {
    position: 'absolute',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.light.tint,
    backgroundColor: 'rgba(122, 162, 255, 0.08)',
  },
  cropBoxShade: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  cropBoxInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  cropCornerHandle: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: Colors.light.tint,
  },
  cropRightHandle: {
    position: 'absolute',
    right: -8,
    top: '28%',
    width: 24,
    height: 74,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: Colors.light.tint,
  },
  cropBottomHandle: {
    position: 'absolute',
    left: '28%',
    bottom: -8,
    width: 74,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: Colors.light.tint,
  },
  cropModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  cvButton: {
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cvButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 12,
    marginTop: 2,
  },
  resultImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(120,120,120,0.1)',
  },
  landmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  warpOpButton: {
    flex: 1,
    minWidth: '40%',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  warpOpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(120,120,120,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(120,120,120,0.2)',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  sideBySide: {
    flexDirection: 'row',
    gap: 8,
  },
  sideBox: {
    flex: 1,
    gap: 4,
  },
  sideLabel: {
    fontSize: 11,
    opacity: 0.7,
    textAlign: 'center',
  },
  sideImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: 'rgba(120,120,120,0.1)',
  },
  agingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
