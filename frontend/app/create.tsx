import { Image } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Modal,
    PanResponder,
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
import { useColorScheme } from '@/hooks/use-color-scheme';
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
              <Ionicons name="image-outline" size={18} color="#FFFFFF" />
              <ThemedText style={styles.uploadButtonText}>Görsel Seç</ThemedText>
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
            <View style={styles.emptyFeatureSpace}>
              <ThemedText style={styles.helperText}>Bu alan şimdilik boş.</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
      </View>

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
});
