import WebRealtimeFace from '@/components/web-realtime-face';
import { Platform } from 'react-native';
import LiveCamera from '../components/live-camera';

export default function CameraPage() {
  if (Platform.OS === 'web') {
    return <WebRealtimeFace />;
  }

  return <LiveCamera />;
}