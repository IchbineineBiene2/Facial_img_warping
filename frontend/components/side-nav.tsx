import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Animated, StyleSheet, Pressable, View } from 'react-native';
import { useEffect, useRef } from 'react';

import { useStudioThemeControls } from '@/hooks/use-color-scheme';

type NavItem = {
  route: '/' | '/create' | '/library' | '/settings';
  icon: keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: NavItem[] = [
  { route: '/', icon: 'home-outline' },
  { route: '/create', icon: 'add-circle-outline' },
  { route: '/library', icon: 'library-outline' },
  { route: '/settings', icon: 'settings-outline' },
];

export function SideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { colorScheme, toggleColorScheme } = useStudioThemeControls();
  const isDark = colorScheme === 'dark';
  const indicator = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    indicator.setValue(0.86);
    Animated.spring(indicator, {
      toValue: 1,
      damping: 12,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [indicator, pathname]);

  return (
    <View style={[styles.sideNav, !isDark ? styles.sideNavLight : null]}>
      <View style={styles.logo}>
        <Ionicons name="flash" size={24} color="#FFFFFF" />
      </View>

      <View style={styles.navStack}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.route || (item.route === '/' && pathname === '/(tabs)');
          return (
            <Pressable
              key={item.route}
              style={[styles.navItem, !isDark ? styles.navItemLight : null, isActive ? [styles.navItemActive, !isDark ? styles.navItemActiveLight : null] : null]}
              onPress={() => router.push(item.route)}>
              <Animated.View style={isActive ? { transform: [{ scale: indicator }] } : null}>
                <Ionicons name={item.icon} size={22} color={isActive ? (isDark ? '#FFFFFF' : '#111217') : '#7D88A0'} />
              </Animated.View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.bottomStack}>
        <Pressable style={[styles.navItem, !isDark ? styles.navItemLight : null]} onPress={toggleColorScheme}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={isDark ? '#FFD500' : '#A020F0'} />
        </Pressable>
        <Pressable style={[styles.navItem, !isDark ? styles.navItemLight : null]} onPress={() => router.push('/profile')}>
          <Ionicons name="person-outline" size={22} color="#7D88A0" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sideNav: {
    width: 80,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(10,10,13,0.74)',
    paddingTop: 30,
    paddingBottom: 28,
    alignItems: 'center',
    zIndex: 5,
  },
  sideNavLight: {
    borderRightColor: 'rgba(20,20,20,0.08)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A020F0',
    shadowColor: '#A020F0',
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  navStack: {
    marginTop: 46,
    gap: 16,
    alignItems: 'center',
  },
  bottomStack: {
    marginTop: 'auto',
    gap: 26,
    alignItems: 'center',
  },
  navItem: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemLight: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  navItemActive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  navItemActiveLight: {
    borderColor: 'rgba(17,18,23,0.85)',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
});
