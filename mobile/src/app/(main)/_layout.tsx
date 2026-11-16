import { Drawer } from 'expo-router/drawer';
import { useWindowDimensions } from 'react-native';

import { SideMenu } from '@/components/SideMenu';
import { colors } from '@/theme';

// Leo is the home screen. Everything else lives in the side menu, which slides in from the left
// (tap the three bars, or swipe from the left edge). Back from any page returns to Leo.
export default function MainLayout() {
  const { width } = useWindowDimensions();
  return (
    <Drawer
      drawerContent={(props) => <SideMenu {...props} />}
      backBehavior="firstRoute"
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: Math.min(320, width * 0.82), backgroundColor: colors.surface },
        overlayColor: 'rgba(13, 13, 18, 0.28)',
        swipeEdgeWidth: 48,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Drawer.Screen name="index" />
      <Drawer.Screen name="products" />
      <Drawer.Screen name="jobs" />
      <Drawer.Screen name="docs" />
      <Drawer.Screen name="me" />
    </Drawer>
  );
}
