import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// umumuneo 웹 앱을 그대로 띄우기만 하는 화면 - 네이티브로 따로 화면을 만들지 않고
// 기존 프론트엔드를 웹뷰로 그대로 보여준다.
// 노치/홈 인디케이터 영역에 네이티브 여백을 따로 안 두고(SafeAreaView 안 씀) 웹뷰를 화면
// 전체로 꽉 채움 - 안쪽 여백 처리는 웹사이트 자체 CSS가 담당해서 배경이 항상 이어짐.
// 다만 WKWebView 안에서 env(safe-area-inset-*) 값이 0으로 읽히는 경우가 있어서,
// 정확한 여백 수치를 RN 쪽에서 직접 CSS 변수로 주입해줌 (--native-safe-top/bottom)
const WEB_URL = 'https://umumuneo.com';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const injectedJs = `
    document.documentElement.style.setProperty('--native-safe-top', '${insets.top}px');
    document.documentElement.style.setProperty('--native-safe-bottom', '${insets.bottom}px');
    true;
  `;

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <WebView
        source={{ uri: WEB_URL }}
        style={styles.webview}
        bounces={false}
        overScrollMode="never"
        injectedJavaScriptBeforeContentLoaded={injectedJs}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
