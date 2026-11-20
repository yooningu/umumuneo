import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// umumuneo 웹 앱을 그대로 띄우기만 하는 화면 - 네이티브로 따로 화면을 만들지 않고
// 기존 프론트엔드를 웹뷰로 그대로 보여준다.
// 노치/홈 인디케이터 영역에 네이티브 여백을 따로 안 두고(SafeAreaView 안 씀) 웹뷰를 화면
// 전체로 꽉 채움 - 안쪽 여백 처리는 웹사이트 자체 CSS가 담당해서 배경이 항상 이어짐.
// 다만 WKWebView 안에서 env(safe-area-inset-*) 값이 0으로 읽히는 경우가 있어서,
// 정확한 여백 수치를 RN 쪽에서 직접 CSS 변수로 주입해줌 (--native-safe-top/bottom)
const WEB_URL = 'http://192.168.0.22:5173/';

// 로컬 테스트 전용 - .env(gitignore됨)의 EXPO_PUBLIC_DEV_ACCESS_TOKEN에 값을 넣어두면
// 로그인 과정 없이 바로 그 액세스 토큰으로 들어가짐. 비워두면 평소처럼 로그인 화면이 뜸
const DEV_ACCESS_TOKEN = process.env.EXPO_PUBLIC_DEV_ACCESS_TOKEN;

// 페이지 배경색을 읽어와서 앱(네이티브) 배경색도 거기에 맞춰줌 - 뒤로가기 스와이프 중
// 웹뷰 바깥(네이티브 배경)이 드러나는 순간에도 튀어 보이지 않게. data-theme이 바뀌면
// (라이트/다크 전환) 다시 보고해서 실시간으로 따라감
const REPORT_BG_JS = `
  (function() {
    function reportBg() {
      var bg = getComputedStyle(document.body).backgroundColor;
      window.ReactNativeWebView.postMessage(bg);
    }
    reportBg();
    new MutationObserver(reportBg).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  })();
  true;
`;

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [bgColor, setBgColor] = useState('#fff');
  const insets = useSafeAreaInsets();

  const injectedJs = `
    document.documentElement.style.setProperty('--native-safe-top', '${insets.top}px');
    document.documentElement.style.setProperty('--native-safe-bottom', '${insets.bottom}px');
    ${DEV_ACCESS_TOKEN ? `
      // 웹뷰 저장소(localStorage)는 cacheEnabled와 무관하게 기기에 계속 남아있어서,
      // 예전 토큰이 안 지워지고 남아있을 수 있음 - 새 토큰 넣기 전에 싹 비움
      localStorage.clear();
      localStorage.setItem('accessToken', ${JSON.stringify(DEV_ACCESS_TOKEN)});
    ` : ''}
    true;
  `;

  const onMessage = (e: WebViewMessageEvent) => {
    setBgColor(e.nativeEvent.data);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar style="auto" />
      <WebView
        source={{ uri: WEB_URL }}
        style={[styles.webview, { backgroundColor: bgColor }]}
        bounces={false}
        overScrollMode="never"
        // 배포할 때마다 웹뷰가 예전 페이지를 캐싱해서 새 버전이 바로 안 보이는 걸 방지
        cacheEnabled={false}
        // iOS 전용 - 왼쪽 끝에서 오른쪽으로 쓸면 뒤로가기(iOS 시스템 제스처). webView.goBack()이
        // window.history를 그대로 쓰는 거라 React Router 경로도 정확히 한 단계 전으로 돌아감
        allowsBackForwardNavigationGestures
        injectedJavaScriptBeforeContentLoaded={injectedJs}
        injectedJavaScript={REPORT_BG_JS}
        onMessage={onMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: bgColor }]}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
