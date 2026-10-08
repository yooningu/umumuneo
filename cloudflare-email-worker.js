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
//
// 첨부파일(이미지/문서 등 모든 종류) 지원: 메일 원본(raw MIME)을 직접 파싱해서 본문 텍스트와
// 첨부파일들을 분리해내고, 첨부파일은 base64로 인코딩해서 본문과 함께 백엔드로 전달함.
// 외부 라이브러리 없이(Quick Edit로 파일 하나만 붙여넣는 배포 방식이라 npm 패키지를 못 씀)
// 직접 파서를 구현했음 - 완벽한 RFC 파서는 아니고 일반적인 메일 형식 정도를 커버함.

// 첨부파일 1개당 이 크기(원본 바이트 기준)를 넘으면 첨부하지 않고 건너뜀 (Worker 메모리/CPU 보호 + 백엔드 한도와 동일)
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB

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

// "Content-Type: multipart/mixed; boundary=abc" 같은 헤더 한 줄에서 boundary 값만 뽑아냄
function extractBoundary(contentTypeHeader) {
  if (!contentTypeHeader) return null;
  const match = contentTypeHeader.match(/boundary="?([^";]+)"?/i);
  return match ? match[1] : null;
}

// "Content-Disposition: attachment; filename="a.png"" 또는
// "Content-Type: image/png; name="a.png"" 에서 파일명을 뽑아냄 (MIME 인코딩돼있으면 디코딩까지)
function extractFilename(headers) {
  const disposition = headers["content-disposition"] || "";
  const contentType = headers["content-type"] || "";
  const match =
    disposition.match(/filename\*?="?([^";]+)"?/i) ||
    contentType.match(/name\*?="?([^";]+)"?/i);
  if (!match) return null;
  // RFC 2231 형식(filename*=UTF-8''%EC%98%88...)이면 URI 디코딩도 시도
  let name = match[1];
  if (name.includes("''")) {
    try {
      name = decodeURIComponent(name.split("''")[1]);
    } catch (e) {
      // 무시하고 원본 사용
    }
  }
  return decodeMimeWords(name);
}

// 파트 하나의 헤더 텍스트를 { "content-type": "...", "content-disposition": "..." } 형태로 파싱
function parseHeaders(headerText) {
  const headers = {};
  // 줄바꿈 후 공백/탭으로 시작하면 이전 헤더의 연속(folding)이므로 이어붙임
  const unfolded = headerText.replace(/\r\n[ \t]/g, " ").replace(/\n[ \t]/g, " ");
  const lines = unfolded.split(/\r\n|\n/);
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    headers[key] = value;
  }
  return headers;
}

// Content-Transfer-Encoding에 따라 파트 본문을 원본 바이트(Uint8Array)로 디코딩
function decodeBody(bodyText, encoding) {
  const enc = (encoding || "7bit").toLowerCase();
  if (enc === "base64") {
    const cleaned = bodyText.replace(/[\r\n\s]/g, "");
    try {
      const binary = atob(cleaned);
      return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } catch (e) {
      return new TextEncoder().encode(bodyText);
    }
  }
  if (enc === "quoted-printable") {
    const replaced = bodyText.replace(/=\r\n/g, "").replace(/=\n/g, "");
    const bytes = [];
    for (let i = 0; i < replaced.length; i++) {
      if (replaced[i] === "=" && i + 2 < replaced.length && /^[0-9A-Fa-f]{2}$/.test(replaced.slice(i + 1, i + 3))) {
        bytes.push(parseInt(replaced.slice(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(replaced.charCodeAt(i));
      }
    }
    return Uint8Array.from(bytes);
  }
  // 7bit/8bit/binary 등 - 텍스트 그대로 바이트로
  return new TextEncoder().encode(bodyText);
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000; // 큰 배열을 한 번에 apply하면 스택 초과날 수 있어 나눠서 처리
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// 결과를 누적하는 컨테이너 - 재귀적으로 multipart를 파고들면서 채워짐
function makeResult() {
  return { textParts: [], htmlParts: [], attachments: [] };
}

// MIME 파트 하나(헤더+본문)를 재귀적으로 파싱해서 result에 텍스트/첨부파일을 누적시킴
function parsePart(rawPart, result) {
  const headerEnd = rawPart.search(/\r\n\r\n|\n\n/);
  if (headerEnd === -1) return;
  const headerText = rawPart.slice(0, headerEnd);
  const sepLength = rawPart.slice(headerEnd).startsWith("\r\n\r\n") ? 4 : 2;
  const bodyText = rawPart.slice(headerEnd + sepLength);

  const headers = parseHeaders(headerText);
  const contentType = (headers["content-type"] || "text/plain").toLowerCase();
  const disposition = (headers["content-disposition"] || "").toLowerCase();
  const filename = extractFilename(headers);

  if (contentType.startsWith("multipart/")) {
    const boundary = extractBoundary(headers["content-type"]);
    if (!boundary) return;
    const subParts = bodyText.split(`--${boundary}`);
    for (const sub of subParts) {
      const trimmed = sub.replace(/^\r\n|^\n/, "");
      if (!trimmed || trimmed.startsWith("--")) continue; // 마지막 종료 경계(--boundary--) 등은 건너뜀
      parsePart(trimmed, result);
    }
    return;
  }

  const isAttachment = disposition.startsWith("attachment") || (filename && disposition.startsWith("inline") === false && !contentType.startsWith("text/"));

  if (!isAttachment && contentType.startsWith("text/plain")) {
    result.textParts.push(new TextDecoder().decode(decodeBody(bodyText, headers["content-transfer-encoding"])));
    return;
  }
  if (!isAttachment && contentType.startsWith("text/html")) {
    result.htmlParts.push(new TextDecoder().decode(decodeBody(bodyText, headers["content-transfer-encoding"])));
    return;
  }

  // 그 외(파일명이 있거나 disposition이 attachment인 것)는 전부 첨부파일로 취급 - 모든 종류의 파일 지원
  if (filename || isAttachment) {
    const bytes = decodeBody(bodyText, headers["content-transfer-encoding"]);
    if (bytes.length > MAX_ATTACHMENT_BYTES) {
      result.textParts.push(`\n[첨부파일 '${filename || "unknown"}'(${Math.round(bytes.length / 1024 / 1024)}MB)는 용량 제한(25MB)으로 첨부되지 않았습니다]\n`);
      return;
    }
    result.attachments.push({
      filename: filename || "attachment",
      contentType: contentType.split(";")[0].trim(),
      dataBase64: bytesToBase64(bytes),
    });
  }
}

// 태그 사이의 "줄바꿈+들여쓰기" 공백만 없애서 용량을 줄인다 (메일 클라이언트가 보기 좋으라고 넣은
// 소스 들여쓰기일 뿐 화면 렌더링엔 영향 없음). 단, 같은 줄에 있는 단어 사이 공백(예: <b>a</b> <i>b</i>의
// 그 한 칸)은 실제로 화면에 보이는 간격이라 건드리면 안 되므로, 줄바꿈이 포함된 공백만 골라서 지운다.
function minifyHtml(html) {
  return html.replace(/>[ \t]*[\r\n]+\s*</g, "><");
}

// HTML 본문만 있고 텍스트 본문이 없을 때 태그를 대충 벗겨서 읽을 수 있게 만듦 (완벽하진 않음)
function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

// 메일 원본(raw MIME) 전체를 파싱해서 { body, bodyHtml, attachments } 반환
// body: 항상 순수 텍스트 (목록 미리보기, 카카오 알림, HTML을 못 그리는 곳에서 씀)
// bodyHtml: 원본 HTML을 그대로 보존 (있을 때만) - 프론트에서 sandbox iframe으로 안전하게 렌더링함
function parseEmail(raw) {
  const headerEnd = raw.search(/\r\n\r\n|\n\n/);
  const topHeaderText = headerEnd === -1 ? raw : raw.slice(0, headerEnd);
  const topHeaders = parseHeaders(topHeaderText);

  const result = makeResult();
  parsePart(raw, result);

  const htmlJoined = result.htmlParts.join("\n");

  let body = result.textParts.join("\n").trim();
  if (!body && htmlJoined) {
    body = stripHtml(htmlJoined);
  }
  body = body.slice(0, 50000); // 너무 길면 잘라냄 (첨부파일과 별개로 본문 자체 - 백엔드 body 컬럼도 MEDIUMTEXT라 넉넉히 담김)

  // HTML 원본은 마크업+인라인 스타일 때문에 텍스트보다 훨씬 길 수 있어 더 넉넉하게 자름 (그래도 무한정 허용하진 않음 - Worker 메모리 보호용).
  // minifyHtml로 의미 없는 들여쓰기 공백부터 먼저 줄여서, 글자수 한도를 실제 내용에 더 쓸 수 있게 함.
  const bodyHtml = htmlJoined ? minifyHtml(htmlJoined.trim()).slice(0, 2000000) : null;

  return { body, bodyHtml, attachments: result.attachments, topHeaders };
}

export default {
  async email(message, env, ctx) {
    const subject = decodeMimeWords(message.headers.get("subject") || "");
    const raw = await new Response(message.raw).text();

    let body = "";
    let bodyHtml = null;
    let attachments = [];
    try {
      const parsed = parseEmail(raw);
      body = parsed.body;
      bodyHtml = parsed.bodyHtml;
      attachments = parsed.attachments;
    } catch (e) {
      // 파싱이 어떤 이유로든 실패해도 최소한 메일 자체는 유실되지 않게 원본 앞부분이라도 본문으로 남김
      const bodyStart = raw.indexOf("\r\n\r\n");
      body = (bodyStart !== -1 ? raw.slice(bodyStart + 4) : raw).slice(0, 5000);
    }

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
        bodyHtml, // 원본 HTML (있을 때만) - 프론트에서 렌더링용. 없으면 null
        attachments, // [{ filename, contentType, dataBase64 }, ...] - 없으면 빈 배열
      }),
    });

    // 백엔드로 전달만 하고 끝. 나중에 실제 메일함으로도 받고 싶으면
    // 아래 줄의 주석을 풀고 본인 이메일 주소를 넣으면 됨.
    // await message.forward("ingu0717@gmail.com");
  },
};
