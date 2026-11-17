import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

// 웹뷰로 웹 앱을 그대로 띄우는 구조라 네이티브 탭이 필요 없음 - 화면 하나만 전체 화면으로 보여줌.
// SafeAreaProvider는 index.tsx에서 useSafeAreaInsets로 노치/홈 인디케이터 수치를 읽어서
// 웹뷰 안 웹페이지에 주입해주기 위해 필요함
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
