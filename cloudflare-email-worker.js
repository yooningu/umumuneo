// Cloudflare Email Routing용 Worker
// 유저마다 개인 별칭(예: abc123@umumuneo.com)을 쓰므로, 특정 주소 하나가 아니라
// "Catch-all"(도메인으로 오는 모든 메일)을 이 Worker로 보내도록 설정해야 함.
//
// 설정법:
//   1. Cloudflare 대시보드 -> umumuneo.com -> Email -> Email Routing 켜기 (DNS records 추가까지 완료)
//   2. Destination Workers 탭 -> Create Worker -> "Create my own" 선택 -> Deploy
//   3. 배포된 Worker 코드 편집 화면에서 아래 코드로 통째로 교체 -> Deploy
//   4. 그 Worker의 Settings -> Variables and Secrets 에서 INBOUND_SECRET 추가
//      (.env의 EMAIL_INBOUND_SECRET과 반드시 똑같은 값)
//   5. Email Routing -> Routing rules 탭에서 "Catch-all" 규칙을 찾아
//      Action: Send to a Worker -> 방금 만든 Worker로 설정 (개별 주소 규칙은 안 만들어도 됨 -
//      abc123@, xyz789@ 등 어떤 별칭으로 와도 이 Worker 하나가 다 받아서 알아서 유저를 찾음)

// 이메일 제목 등에 한글/특수문자가 있으면 "=?utf-8?B?...?="  같은 MIME 인코딩된 형태로 오는데,
// 그대로 두면 사람이 못 읽으니 원래 텍스트로 풀어줌 (RFC 2047)
function decodeMimeWords(str) {
  if (!str) return str;
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=\s*/g, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const binary = atob(text);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      } else {
        const replaced = text.replace(/_/g, " ");
        const bytes = [];
        for (let i = 0; i < replaced.length; i++) {
          if (replaced[i] === "=" && i + 2 < replaced.length) {
            bytes.push(parseInt(replaced.slice(i + 1, i + 3), 16));
            i += 2;
          } else {
            bytes.push(replaced.charCodeAt(i));
          }
        }
        return new TextDecoder(charset).decode(Uint8Array.from(bytes));
      }
    } catch (e) {
      return match; // 디코딩 실패하면 원문 그대로 둠
    }
  });
}

export default {
  async email(message, env, ctx) {
    const subject = decodeMimeWords(message.headers.get("subject") || "");

    // 원본 이메일(raw MIME)을 읽어서 본문 텍스트를 최대한 뽑아냄 (완벽한 MIME 파싱은 아니고 간단한 버전)
    const raw = await new Response(message.raw).text();
    const bodyStart = raw.indexOf("\r\n\r\n");
    let body = bodyStart !== -1 ? raw.slice(bodyStart + 4) : raw;
    body = body.slice(0, 5000); // 너무 길면 잘라냄

    await fetch("https://api.umumuneo.com/api/v1/email/inbound", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Inbound-Secret": env.INBOUND_SECRET,
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to, // 예: "abc123@umumuneo.com" - 백엔드가 이 앞부분으로 어느 유저인지 찾음
        subject,
        body,
      }),
    });

    // 백엔드로 전달만 하고 끝. 나중에 실제 메일함으로도 받고 싶으면
    // 아래 줄의 주석을 풀고 본인 이메일 주소를 넣으면 됨.
    // await message.forward("ingu0717@gmail.com");
  },
};
