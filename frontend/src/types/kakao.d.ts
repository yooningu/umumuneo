// 카카오맵 JS SDK는 공식 타입 패키지가 없어서, 쓰는 부분만 최소한으로 any 선언해서 씀
export {};

declare global {
  interface Window {
    kakao: any;
  }
}
