import { Animated, Easing, StyleSheet, View, type ViewProps } from 'react-native';
import { useEffect, useRef } from 'react';

import { SideNav } from '@/components/side-nav';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const STUDIO = {
  accent: '#A020F0',
  accent2: '#EC5AC7',
  bg: '#0A0B0D',
  panel: '#1F1D22',
  panel2: '#242128',
  muted: '#7D88A0',
  text: '#F4F1F6',
  border: 'rgba(255,255,255,0.10)',
  lightBg: '#F7F4FB',
  lightPanel: '#FFFFFF',
  lightText: '#111217',
  lightMuted: '#657086',
  lightBorder: 'rgba(20,20,20,0.08)',
};

type StudioScreenProps = ViewProps & {
  withNav?: boolean;
};

export function StudioScreen({ children, style, withNav = true, ...props }: StudioScreenProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const backgroundColor = isDark ? STUDIO.bg : STUDIO.lightBg;
  const entrance = useRef(new Animated.Value(0)).current;
  const blobDrift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, colorScheme]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(blobDrift, {
          toValue: 1,
          duration: 6200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(blobDrift, {
          toValue: 0,
          duration: 6200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [blobDrift]);

  const contentTranslate = entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const blobTranslate = blobDrift.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });

  return (
    <View style={[styles.screen, { backgroundColor }, style]} {...props}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.blob,
            styles.blobOne,
            !isDark ? styles.blobOneLight : null,
            { transform: [{ translateX: blobTranslate }, { scaleX: 1.5 }] },
          ]}
        />
        <Animated.View style={[styles.blob, styles.blobTwo, !isDark ? styles.blobTwoLight : null, { transform: [{ translateY: blobTranslate }] }]} />
        <View style={[styles.blob, styles.blobThree, !isDark ? styles.blobThreeLight : null]} />
        <View style={[styles.vignette, !isDark ? styles.vignetteLight : null]} />
      </View>
      {withNav ? <SideNav /> : null}
      <Animated.View style={[styles.body, { opacity: entrance, transform: [{ translateY: contentTranslate }] }]}>{children}</Animated.View>
    </View>
  );
}

export function StudioCard({ children, style, ...props }: ViewProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.card, !isDark ? styles.cardLight : null, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    zIndex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.24,
  },
  blobOne: {
    left: 70,
    top: -140,
    width: 540,
    height: 540,
    backgroundColor: '#4C1D95',
  },
  blobOneLight: {
    backgroundColor: '#E9D5FF',
    opacity: 0.46,
  },
  blobTwo: {
    right: -260,
    top: 180,
    width: 660,
    height: 520,
    backgroundColor: '#1F2937',
  },
  blobTwoLight: {
    backgroundColor: '#E0E7FF',
    opacity: 0.38,
  },
  blobThree: {
    left: 180,
    bottom: -260,
    width: 520,
    height: 420,
    backgroundColor: '#581C87',
    opacity: 0.16,
  },
  blobThreeLight: {
    backgroundColor: '#FBCFE8',
    opacity: 0.34,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  vignetteLight: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  card: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: STUDIO.border,
    backgroundColor: 'rgba(35,32,39,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.34,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 26 },
  },
  cardLight: {
    borderColor: STUDIO.lightBorder,
    backgroundColor: 'rgba(255,255,255,0.88)',
    shadowOpacity: 0.11,
  },
});
