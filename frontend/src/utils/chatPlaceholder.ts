// 챗봇 입력창이 비어있을 때 보여주는 안내 문구 - 시간대별로 여러 개 중 하나를 무작위로 고름
const POOLS: { from: number; to: number; lines: string[] }[] = [
  {
    from: 0, to: 5, lines: [
      '아직 안 주무셨어요? 우무는 여기 있어요',
      '늦은 시간이에요. 무리하지 말아요',
      '새벽에도 우무는 깨어 있어요',
      '졸리면 일정은 우무가 챙겨둘게요'
    ]
  },
  {
    from: 6, to: 10, lines: [
      '좋은 아침이에요! 오늘 일정 같이 볼까요?',
      '일어나셨어요? 오늘도 힘차게 시작해요',
      '오늘 날씨부터 확인해볼까요?',
      '아침이에요! 우무가 오늘 할 일을 준비해뒀어요'
    ]
  },
  {
    from: 11, to: 13, lines: [
      '점심은 드셨어요? 오후 일정 챙겨둘게요',
      '맛있는 점심 드세요! 우무는 기다릴게요',
      '밥 먹고 나면 오후 일정을 알려드릴게요'
    ]
  },
  {
    from: 14, to: 17, lines: [
      '오후도 힘내요! 남은 일정은 우무가 알려드릴게요',
      '졸린 오후예요. 잠깐 쉬어가요',
      '퇴근 전에 오늘 일정 한 번 확인해볼까요?'
    ]
  },
  {
    from: 18, to: 21, lines: [
      '오늘도 수고했어요! 저녁은 드셨나요?',
      '돌아오셨네요! 내일 일정 미리 볼까요?',
      '오늘 하루 어땠어요? 우무가 정리해뒀어요'
    ]
  },
  {
    from: 22, to: 23, lines: [
      '하루 마무리할 시간이에요. 내일 일정은 우무가 챙길게요',
      '오늘도 고생했어요. 푹 쉬어요'
    ]
  }
];

export function pickChatPlaceholder(): string {
  const hour = new Date().getHours();
  const pool = POOLS.find(p => hour >= p.from && hour <= p.to) ?? POOLS[1];
  return pool.lines[Math.floor(Math.random() * pool.lines.length)];
}
