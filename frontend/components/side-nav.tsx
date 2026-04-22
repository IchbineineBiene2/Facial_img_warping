import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type NavItem = {
  label: string;
  route: '/' | '/create' | '/library' | '/settings';
  icon: 'home' | 'create' | 'library' | 'settings';
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Anasayfa', route: '/', icon: 'home' },
  { label: 'Olustur', route: '/create', icon: 'create' },
  { label: 'Kutuphane', route: '/library', icon: 'library' },
  { label: 'Ayarlar', route: '/settings', icon: 'settings' },
];

export function SideNav() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.sideNav,
        {
          backgroundColor: colors.background,
          borderRightColor: isDark ? '#2F3336' : '#E3E6EA',
        },
      ]}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.route;
        return (
          <Pressable
            key={item.route}
            style={[styles.navItem, isActive ? styles.navItemActive : null]}
            onPress={() => router.push(item.route)}>
            <Ionicons name={item.icon} size={28} color={colors.text} />
            <ThemedText style={styles.navLabel}>{item.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sideNav: {
    width: 112,
    borderRightWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItem: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navItemActive: {
    backgroundColor: 'rgba(120,120,120,0.14)',
  },
  navLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});
