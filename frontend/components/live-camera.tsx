import { Ionicons } from '@expo/vector-icons';
import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type CaptureMode = CameraMode;

const createFileName = (kind: 'photo' | 'video', extension: string) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `facial-camera-${kind}-${stamp}.${extension}`;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getBestRecordingMimeType = () => {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
};

function WebCamera() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [facing, setFacing] = useState<CameraType>('front');
  const [mode, setMode] = useState<CaptureMode>('picture');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Webde cekimler otomatik indirilecek.');

  useEffect(() => {
    let active = true;

    const startStream = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionBlocked(true);
        setStatusMessage('Tarayici kamera API desteklemiyor.');
        return;
      }

      setIsCameraReady(false);
      setPermissionBlocked(false);

      streamRef.current?.getTracks().forEach((track) => track.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing === 'front' ? 'user' : 'environment',
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsCameraReady(true);
        setStatusMessage('Kamera hazir. Webde dosya indirme olarak kaydedilir.');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Kamera acilamadi.';
        setPermissionBlocked(true);
        setStatusMessage(message);
      }
    };

    startStream();

    return () => {
      active = false;
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facing]);

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !isCameraReady || isCapturing || isRecording) {
      return;
    }

    setIsCapturing(true);
    setStatusMessage('Foto hazirlaniyor...');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Foto isleme alani olusturulamadi.');
      }

      if (facing === 'front') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (nextBlob) {
            resolve(nextBlob);
          } else {
            reject(new Error('Foto dosyasi olusturulamadi.'));
          }
        }, 'image/jpeg', 0.92);
      });

      downloadBlob(blob, createFileName('photo', 'jpg'));
      setStatusMessage('Foto indirildi.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Foto cekilemedi.';
      setStatusMessage(message);
      Alert.alert('Foto kaydedilemedi', message);
    } finally {
      setIsCapturing(false);
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || !isCameraReady || isRecording || isCapturing) {
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      Alert.alert('Video desteklenmiyor', 'Bu tarayici MediaRecorder API desteklemiyor.');
      return;
    }

    const mimeType = getBestRecordingMimeType();
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blobType = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: blobType });
      const extension = blobType.includes('mp4') ? 'mp4' : 'webm';
      downloadBlob(blob, createFileName('video', extension));
      chunksRef.current = [];
      recorderRef.current = null;
      setIsRecording(false);
      setStatusMessage('Video indirildi.');
    };

    recorder.start();
    setIsRecording(true);
    setStatusMessage('Video kaydi basladi.');
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') {
      return;
    }

    setStatusMessage('Video hazirlaniyor...');
    recorderRef.current.stop();
  };

  const toggleCameraFacing = () => {
    if (isRecording) {
      return;
    }

    setFacing((current) => (current === 'front' ? 'back' : 'front'));
  };

  const changeMode = (nextMode: CaptureMode) => {
    if (!isRecording) {
      setMode(nextMode);
    }
  };

  return (
    <View style={styles.screen}>
      {React.createElement('video', {
        ref: videoRef,
        autoPlay: true,
        muted: true,
        playsInline: true,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: facing === 'front' ? 'scaleX(-1)' : 'none',
          backgroundColor: '#050608',
        },
      })}

      {permissionBlocked ? (
        <View style={styles.webPermissionOverlay}>
          <Ionicons name="camera-outline" size={44} color="#FFFFFF" />
          <Text style={styles.permissionTitle}>Kamera acilamadi</Text>
          <Text style={styles.permissionText}>
            Tarayici izinlerini kontrol edip sayfayi yenileyebilirsin. Webde kamera icin localhost veya HTTPS gerekir.
          </Text>
        </View>
      ) : null}

      <CameraControls
        mode={mode}
        isCameraReady={isCameraReady}
        isCapturing={isCapturing}
        isRecording={isRecording}
        statusMessage={statusMessage}
        onBack={() => router.back()}
        onToggleFacing={toggleCameraFacing}
        onChangeMode={changeMode}
        onTakePhoto={takePhoto}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />
    </View>
  );
}

function NativeCamera() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions({
    writeOnly: true,
    granularPermissions: ['photo', 'video'],
  });
  const [facing, setFacing] = useState<CameraType>('front');
  const [mode, setMode] = useState<CaptureMode>('picture');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Foto veya video cekip otomatik kaydedebilirsin.');

  const ensureMediaPermission = async () => {
    if (mediaPermission?.granted) {
      return;
    }

    const nextPermission = await requestMediaPermission();
    if (!nextPermission.granted) {
      throw new Error('Cihaza kaydetmek icin medya kutuphanesi izni gerekli.');
    }
  };

  const saveToDevice = async (uri: string, kind: 'photo' | 'video') => {
    await ensureMediaPermission();
    await MediaLibrary.saveToLibraryAsync(uri);
    setStatusMessage(kind === 'photo' ? 'Foto cihaza kaydedildi.' : 'Video cihaza kaydedildi.');
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing || isRecording) {
      return;
    }

    setIsCapturing(true);
    setStatusMessage('Foto cekiliyor...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        exif: false,
        shutterSound: true,
      });

      if (!photo?.uri) {
        throw new Error('Foto dosyasi olusturulamadi.');
      }

      await saveToDevice(photo.uri, 'photo');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Foto cekilemedi.';
      setStatusMessage(message);
      Alert.alert('Foto kaydedilemedi', message);
    } finally {
      setIsCapturing(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing || isRecording) {
      return;
    }

    if (!microphonePermission?.granted) {
      const nextPermission = await requestMicrophonePermission();
      if (!nextPermission.granted) {
        Alert.alert('Mikrofon izni gerekli', 'Video kaydi icin mikrofon izni vermelisin.');
        return;
      }
    }

    setMode('video');
    setIsRecording(true);
    setStatusMessage('Video kaydi basladi.');

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 120,
      });

      if (!video?.uri) {
        throw new Error('Video dosyasi olusturulamadi.');
      }

      await saveToDevice(video.uri, 'video');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video kaydedilemedi.';
      setStatusMessage(message);
      Alert.alert('Video kaydedilemedi', message);
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!cameraRef.current || !isRecording) {
      return;
    }

    setStatusMessage('Video kaydediliyor...');
    cameraRef.current.stopRecording();
  };

  const toggleCameraFacing = () => {
    if (isRecording) {
      return;
    }

    setFacing((current) => (current === 'front' ? 'back' : 'front'));
  };

  const changeMode = (nextMode: CaptureMode) => {
    if (!isRecording) {
      setMode(nextMode);
    }
  };

  if (!cameraPermission) {
    return <View style={styles.screen} />;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Ionicons name="camera-outline" size={46} color="#FFFFFF" />
        <Text style={styles.permissionTitle}>Kamera izni gerekli</Text>
        <Text style={styles.permissionText}>
          Foto veya video cekebilmek icin kamera iznini acmalisin.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>Izin ver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode}
        mirror={facing === 'front'}
        videoQuality="1080p"
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={({ message }) => {
          setStatusMessage(message);
          Alert.alert('Kamera acilamadi', message);
        }}
      />

      <CameraControls
        mode={mode}
        isCameraReady={isCameraReady}
        isCapturing={isCapturing}
        isRecording={isRecording}
        statusMessage={statusMessage}
        onBack={() => router.back()}
        onToggleFacing={toggleCameraFacing}
        onChangeMode={changeMode}
        onTakePhoto={takePhoto}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />
    </View>
  );
}

type CameraControlsProps = {
  mode: CaptureMode;
  isCameraReady: boolean;
  isCapturing: boolean;
  isRecording: boolean;
  statusMessage: string;
  onBack: () => void;
  onToggleFacing: () => void;
  onChangeMode: (mode: CaptureMode) => void;
  onTakePhoto: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

function CameraControls({
  mode,
  isCameraReady,
  isCapturing,
  isRecording,
  statusMessage,
  onBack,
  onToggleFacing,
  onChangeMode,
  onTakePhoto,
  onStartRecording,
  onStopRecording,
}: CameraControlsProps) {
  return (
    <>
      <View style={styles.topBar}>
        <Pressable style={styles.roundButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.statusPill}>
          {isCapturing ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
        <Pressable style={styles.roundButton} onPress={onToggleFacing} disabled={isRecording}>
          <Ionicons name="camera-reverse-outline" size={23} color={isRecording ? '#6B7280' : '#FFFFFF'} />
        </Pressable>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.modeSwitch}>
          <Pressable
            style={[styles.modeButton, mode === 'picture' && styles.modeButtonActive]}
            onPress={() => onChangeMode('picture')}
            disabled={isRecording}>
            <Ionicons name="image-outline" size={17} color="#FFFFFF" />
            <Text style={styles.modeText}>Foto</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === 'video' && styles.modeButtonActive]}
            onPress={() => onChangeMode('video')}
            disabled={isRecording}>
            <Ionicons name="videocam-outline" size={17} color="#FFFFFF" />
            <Text style={styles.modeText}>Video</Text>
          </Pressable>
        </View>

        <View style={styles.captureRow}>
          <View style={styles.sideSlot} />
          {mode === 'picture' ? (
            <Pressable
              style={[styles.captureButton, (isCapturing || !isCameraReady) && styles.captureButtonDisabled]}
              onPress={onTakePhoto}
              disabled={isCapturing || !isCameraReady}>
              {isCapturing ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.captureButton,
                styles.videoCaptureButton,
                isRecording && styles.videoStopButton,
                (!isCameraReady || isCapturing) && styles.captureButtonDisabled,
              ]}
              onPress={isRecording ? onStopRecording : onStartRecording}
              disabled={!isCameraReady || isCapturing}>
              <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
            </Pressable>
          )}
          <View style={styles.sideSlot}>
            {isRecording ? <Text style={styles.recordingText}>REC</Text> : null}
          </View>
        </View>
      </View>
    </>
  );
}

export default function LiveCamera() {
  if (Platform.OS === 'web') {
    return <WebCamera />;
  }

  return <NativeCamera />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050608',
  },
  permissionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 28,
    backgroundColor: '#050608',
  },
  webPermissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 28,
    backgroundColor: 'rgba(5,6,8,0.88)',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  permissionButton: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A020F0',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  statusPill: {
    flex: 1,
    minHeight: 46,
    borderRadius: 23,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 22,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  modeSwitch: {
    alignSelf: 'center',
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  modeButton: {
    height: 36,
    minWidth: 96,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(160,32,240,0.95)',
  },
  modeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  captureRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideSlot: {
    width: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.48)',
  },
  captureButtonDisabled: {
    opacity: 0.58,
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  videoCaptureButton: {
    backgroundColor: '#FFFFFF',
  },
  videoStopButton: {
    borderColor: 'rgba(239,68,68,0.48)',
  },
  recordIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#EF4444',
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  recordingText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
});
