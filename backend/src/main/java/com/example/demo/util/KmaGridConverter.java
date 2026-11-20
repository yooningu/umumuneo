package com.example.demo.util;

// 기상청 단기예보 API(WeatherService)는 위경도가 아니라 자체 격자 좌표(nx, ny)를 요구함.
// VWorld 등에서 받아온 위경도를 기상청 격자로 바꾸는 변환식 - 기상청이 공개한 LCC(람베르트 정각원추)
// 투영 공식 그대로(기상청 날씨누리 개발자 가이드에 실린 표준 변환 로직), 상수들도 고정값
public final class KmaGridConverter {

    private static final double RE = 6371.00877; // 지구 반경(km)
    private static final double GRID = 5.0;       // 격자 간격(km)
    private static final double SLAT1 = 30.0;     // 투영 위도1(degree)
    private static final double SLAT2 = 60.0;     // 투영 위도2(degree)
    private static final double OLON = 126.0;     // 기준점 경도(degree)
    private static final double OLAT = 38.0;      // 기준점 위도(degree)
    private static final double XO = 43;          // 기준점 X좌표(GRID)
    private static final double YO = 136;         // 기준점 Y좌표(GRID)
    private static final double DEGRAD = Math.PI / 180.0;

    private KmaGridConverter() {
    }

    public record Grid(int nx, int ny) {}

    public static Grid toGrid(double lat, double lon) {
        double re = RE / GRID;
        double slat1 = SLAT1 * DEGRAD;
        double slat2 = SLAT2 * DEGRAD;
        double olon = OLON * DEGRAD;
        double olat = OLAT * DEGRAD;

        double sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
        sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
        double sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
        sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
        double ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
        ro = re * sf / Math.pow(ro, sn);

        double ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
        ra = re * sf / Math.pow(ra, sn);
        double theta = lon * DEGRAD - olon;
        if (theta > Math.PI) theta -= 2.0 * Math.PI;
        if (theta < -Math.PI) theta += 2.0 * Math.PI;
        theta *= sn;

        int nx = (int) Math.floor(ra * Math.sin(theta) + XO + 0.5);
        int ny = (int) Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
        return new Grid(nx, ny);
    }
}
