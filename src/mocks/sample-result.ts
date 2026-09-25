import type { AnalysisResult } from "@/shared/api/types";

/**
 * Illustrative sample data. It is NOT derived from any real recording and is
 * always returned with `isSample: true` so the UI can label it.
 */
export const SAMPLE_RESULT: AnalysisResult = {
  presentationId: "sample",
  title: "동네 카페를 위한 수요 예측 도입 제안",
  durationSec: 372,
  analyzedAt: "2026-09-23T05:00:00.000Z",
  isSample: true,
  summary: {
    headline: "도입 배경은 모두 따라왔지만, 성능 수치가 나오는 순간부터 청중 절반이 흐름을 놓쳤어요.",
    intendedKeyMessage: "수요 예측을 도입하면 매달 버려지는 재료 비용을 크게 줄일 수 있다.",
    priorityFixSectionId: "sec-metric",
    strengths: [
      "첫 30초에 실제 폐기 사진 사례로 문제를 생생하게 보여줬어요.",
      "말하는 속도가 전반적으로 차분하고 일정했어요.",
      "마지막에 다음 단계(2주 시범 운영)를 구체적으로 제안했어요.",
    ],
  },
  personas: [
    {
      id: "p-beginner",
      kind: "beginner",
      name: "비전공 관중",
      description: "데이터 분석을 처음 듣는 일반 관중이에요.",
      listensFor: "처음 듣는 말도 이해할 수 있게 풀어서 설명해 주는지",
    },
    {
      id: "p-peer",
      kind: "peer",
      name: "일반 관중",
      description: "주제에 관심은 있지만 세부 내용은 처음 듣는 관중이에요.",
      listensFor: "이야기의 흐름과 핵심 메시지가 한 번에 잡히는지",
    },
    {
      id: "p-expert",
      kind: "expert",
      name: "전문가 관중",
      description: "예측 모델을 실무에서 다뤄본 전문가 관중이에요.",
      listensFor: "방법론의 근거와 검증 방식이 타당한지",
    },
  ],
  personaFeedback: [
    {
      personaId: "p-beginner",
      understanding: "partly_lost",
      receivedKeyMessage: true,
      reaction: "재료가 버려진다는 문제는 확 와닿았어요. 그런데 ‘MAPE’가 나온 뒤로는 숫자가 좋은 건지 나쁜 건지 모르겠더라고요.",
      whatLanded: ["매일 버려지는 재료가 많다는 문제", "2주 시범 운영 제안"],
      whereLost: ["MAPE 12.4% 개선의 의미", "변수 9개를 연달아 나열한 부분"],
      difficultSectionIds: ["sec-metric", "sec-features"],
    },
    {
      personaId: "p-peer",
      understanding: "followed",
      receivedKeyMessage: true,
      reaction: "전체 흐름은 따라갔어요. 다만 변수를 쭉 나열할 때는 무엇이 중요한지 몰라서 잠깐 집중이 흐려졌어요.",
      whatLanded: ["문제 → 방법 → 결과로 이어지는 구조", "시범 운영 제안"],
      whereLost: ["변수 9개를 연달아 나열한 부분"],
      difficultSectionIds: ["sec-features"],
    },
    {
      personaId: "p-expert",
      understanding: "partly_lost",
      receivedKeyMessage: true,
      reaction: "모델 선택 이유가 ‘더 잘 나와서’뿐이라 아쉬워요. 어떤 기간으로 검증했는지, 비교 기준이 무엇인지 궁금했어요.",
      whatLanded: ["문제 정의가 명확함", "현실적인 시범 운영 계획"],
      whereLost: ["모델 비교의 근거와 검증 방법"],
      difficultSectionIds: ["sec-model"],
    },
  ],
  difficultSections: [
    {
      id: "sec-metric",
      startSec: 48,
      endSec: 71,
      transcript:
        "저희가 만든 모델은 기존 방식 대비 MAPE 기준으로 12.4% 개선된 성능을 보였고, 이는 꽤 의미 있는 수치라고 생각합니다.",
      highlight: "MAPE 기준으로 12.4% 개선된",
      category: "terminology",
      severity: "high",
      reactions: [
        { personaId: "p-beginner", reaction: "MAPE가 뭔지 몰라서, 12.4%가 좋은 건지 판단할 수 없었어요." },
        { personaId: "p-peer", reaction: "숫자는 들었는데 우리 가게에 어떤 의미인지 연결이 안 됐어요." },
      ],
      reason:
        "전문 지표를 정의 없이 사용했고, ‘12.4% 개선’이 무엇의 12.4%인지(오차율인지, 판매량인지) 기준점이 빠져 있어요.",
      cause: "TERM_CONFUSION",
      likelihood: "high",
      pattern: "전문가는 MAPE를 이미 알고 있어 바로 해석했지만, 비전공·일반 관중은 비교 기준이 없어 숫자를 자기 가게의 변화로 옮기지 못했을 가능성이 높아요.",
      improvement: {
        suggestion: "지표 이름 대신 ‘예측이 평균적으로 얼마나 빗나가는지’로 먼저 설명하고, 실제 개수나 금액으로 바꿔 말해 보세요.",
        rewrite:
          "“지금은 하루 판매량 예측이 평균 10개쯤 빗나가는데, 새 방식은 7개 정도로 줄었어요. 덜 빗나가는 만큼 덜 버리게 됩니다.”",
      },
    },
    {
      id: "sec-features",
      startSec: 125,
      endSec: 160,
      transcript:
        "입력 변수로는 요일, 공휴일 여부, 기온, 강수량, 전주 판매량, 이동평균, 인근 행사, 프로모션 여부, 그리고 재고 수준을 사용했습니다.",
      highlight: "요일, 공휴일 여부, 기온, 강수량, 전주 판매량, 이동평균, 인근 행사, 프로모션 여부, 그리고 재고 수준",
      category: "structure",
      severity: "medium",
      reactions: [
        { personaId: "p-peer", reaction: "하나하나 듣다가 무엇이 중요한지 놓쳤어요." },
        { personaId: "p-beginner", reaction: "‘이동평균’에서 멈췄고, 그 뒤는 거의 흘려들었어요." },
      ],
      reason: "9개 항목을 묶음 없이 한 문장에 나열해서, 듣는 사람이 기억하거나 우선순위를 파악하기 어려워요.",
      cause: "CONNECTION_CONFUSION",
      likelihood: "likely",
      pattern: "항목 하나하나는 익숙한 말이지만 무엇이 중요한지 묶어 주지 않아, 배경지식과 관계없이 세 관중 모두 우선순위를 스스로 만들어야 했을 가능성이 있어요.",
      improvement: {
        suggestion: "변수를 2~3개의 묶음으로 나누고, 가장 영향이 컸던 하나를 예시와 함께 강조하세요.",
        rewrite:
          "“크게 세 가지를 봤어요. 날짜와 날씨, 최근 판매 흐름, 그리고 가게 안팎의 이벤트예요. 그중 비 오는 날의 영향이 가장 컸어요.”",
      },
    },
    {
      id: "sec-model",
      startSec: 210,
      endSec: 245,
      transcript:
        "ARIMA와 LightGBM을 비교해 봤는데 LightGBM이 더 잘 나와서 최종적으로 LightGBM을 선택했습니다.",
      highlight: "LightGBM이 더 잘 나와서",
      category: "missing_context",
      severity: "medium",
      reactions: [
        { personaId: "p-expert", reaction: "어떤 기간으로, 어떤 방식으로 검증했는지 없이 결론만 들렸어요." },
      ],
      reason: "비교의 기준(검증 기간, 평가 방식, 단순 기준선)이 빠져 있어서 결과를 신뢰할 근거가 부족해요.",
      cause: "LOGIC_GAP",
      likelihood: "likely",
      pattern: "비전공 관중은 모델 이름에서 이미 멈췄고, 전문가 관중은 이름은 알지만 검증 방식이 빠져 결론을 믿을 근거를 찾지 못했을 가능성이 높아요. 원인은 달라도 같은 구간에서 멈췄어요.",
      improvement: {
        suggestion: "검증 방식을 한 문장으로 덧붙이고, ‘지난주 판매량 그대로’ 같은 단순 기준선과도 비교했음을 알려주세요.",
        rewrite:
          "“최근 8주를 따로 떼어 두고 매주 예측해 봤어요. ‘지난주와 같다’는 단순 예측보다 LightGBM이 오차를 30% 줄였습니다.”",
      },
    },
    {
      id: "sec-conclusion",
      startSec: 310,
      endSec: 340,
      transcript:
        "정리하자면 여러 측면에서 개선이 있었고, 참고로 폐기 비용으로 환산하면 월 18만 원 정도 줄어드는 효과도 기대할 수 있습니다.",
      highlight: "참고로 폐기 비용으로 환산하면 월 18만 원 정도 줄어드는",
      category: "key_message",
      severity: "high",
      reactions: [
        { personaId: "p-peer", reaction: "가장 궁금했던 금액이 ‘참고로’ 뒤에 묻혀서 지나갔어요." },
      ],
      reason: "결정에 가장 중요한 숫자(월 절감액)가 결론의 부연처럼 전달돼 핵심 메시지로 인식되지 않아요.",
      cause: "PURPOSE_CONFUSION",
      likelihood: "possible",
      pattern: "비용 절감을 기대하던 일반 관중에게는 가장 중요한 숫자였지만 ‘참고로’ 뒤에 나와서 부연으로 흘려들었을 가능성이 있어요.",
      improvement: {
        suggestion: "절감 금액을 발표 도입부와 결론 첫 문장에 두 번 배치하고, 요청하는 결정을 분명히 말하세요.",
        rewrite:
          "“결론부터 말씀드리면, 매달 약 18만 원의 폐기 비용을 줄일 수 있습니다. 그래서 2주 시범 운영을 제안드립니다.”",
      },
    },
  ],
  missingExplanations: [
    {
      id: "me-mape",
      term: "MAPE",
      why: "입문 청중과 운영자가 성능 수치를 해석하지 못했어요.",
      suggestedExplanation: "예측값이 실제값과 평균 몇 % 차이 나는지를 나타내는 오차율이에요. 낮을수록 좋아요.",
      personaIds: ["p-beginner", "p-peer"],
      sectionId: "sec-metric",
    },
    {
      id: "me-moving-average",
      term: "이동평균",
      why: "입문 청중이 이 단어에서 흐름을 놓쳤어요.",
      suggestedExplanation: "최근 며칠 판매량의 평균이에요. 하루하루의 들쭉날쭉함을 부드럽게 보여줘요.",
      personaIds: ["p-beginner"],
      sectionId: "sec-features",
    },
    {
      id: "me-validation",
      term: "검증 방법",
      why: "전문 청중이 결과를 신뢰할 근거를 찾지 못했어요.",
      suggestedExplanation: "모델이 보지 않은 최근 8주 데이터로 매주 예측해 실제와 비교했다고 설명하세요.",
      personaIds: ["p-expert"],
      sectionId: "sec-model",
    },
  ],
  exampleSuggestions: [
    {
      id: "ex-rain",
      concept: "날씨 변수가 중요한 이유",
      example: "“비 오는 화요일에는 아이스 음료가 평소보다 40% 덜 팔렸어요. 그날 미리 얼음과 우유를 덜 준비했다면 버리지 않았겠죠.”",
      personaIds: ["p-beginner", "p-peer"],
      sectionId: "sec-features",
    },
    {
      id: "ex-cost",
      concept: "예측 오차를 비용으로 바꾸기",
      example: "“예측이 하루 3개 덜 빗나가면, 크루아상 원가 1,500원 × 3개 × 30일 = 한 달 13만 5천 원이에요.”",
      personaIds: ["p-peer"],
      sectionId: "sec-conclusion",
    },
  ],
  transcript: {
    text: "",
    segments: [
      { id: "seg-01", startSec: 0, endSec: 22, text: "안녕하세요. 오늘은 저희 동네 카페에서 매일 버려지는 재료 이야기로 시작해 보려고 합니다." },
      { id: "seg-02", startSec: 22, endSec: 47, text: "이 사진은 지난주 화요일 마감 후에 버린 우유와 크루아상이에요. 이런 날이 한 달에 열흘이 넘습니다." },
      { id: "sec-metric", startSec: 48, endSec: 71, text: "저희가 만든 모델은 기존 방식 대비 MAPE 기준으로 12.4% 개선된 성능을 보였고, 이는 꽤 의미 있는 수치라고 생각합니다." },
      { id: "seg-04", startSec: 71, endSec: 95, text: "그래서 이 결과가 어떻게 나왔는지, 어떤 데이터를 썼는지 먼저 설명드리겠습니다." },
      { id: "seg-05", startSec: 96, endSec: 124, text: "데이터는 지난 1년간의 판매 기록과 날씨, 그리고 주변 행사 일정을 모았습니다." },
      { id: "sec-features", startSec: 125, endSec: 160, text: "입력 변수로는 요일, 공휴일 여부, 기온, 강수량, 전주 판매량, 이동평균, 인근 행사, 프로모션 여부, 그리고 재고 수준을 사용했습니다." },
      { id: "seg-07", startSec: 160, endSec: 209, text: "이 데이터를 바탕으로 두 가지 방식의 예측 모델을 만들어 봤습니다." },
      { id: "sec-model", startSec: 210, endSec: 245, text: "ARIMA와 LightGBM을 비교해 봤는데 LightGBM이 더 잘 나와서 최종적으로 LightGBM을 선택했습니다." },
      { id: "seg-09", startSec: 246, endSec: 309, text: "실제로 지난 한 달 동안 예측대로 준비했다면 어땠을지 날짜별로 되짚어 봤습니다." },
      { id: "sec-conclusion", startSec: 310, endSec: 340, text: "정리하자면 여러 측면에서 개선이 있었고, 참고로 폐기 비용으로 환산하면 월 18만 원 정도 줄어드는 효과도 기대할 수 있습니다." },
      { id: "seg-11", startSec: 340, endSec: 372, text: "그래서 다음 달부터 2주 동안 시범 운영을 해 보는 것을 제안드립니다. 감사합니다." },
    ],
  },
  presentationMap: {
    sections: [
      {
        id: "map-problem",
        title: "문제 제기",
        startSec: 0,
        endSec: 47,
        summary: "마감 후 버려지는 재료 사진으로 폐기 문제를 보여줘요.",
        segmentIds: ["seg-01", "seg-02"],
        difficultSectionIds: [],
      },
      {
        id: "map-result",
        title: "성과 수치",
        startSec: 48,
        endSec: 95,
        summary: "새 예측 모델이 기존보다 낫다는 결과를 먼저 제시해요.",
        segmentIds: ["sec-metric", "seg-04"],
        difficultSectionIds: ["sec-metric"],
      },
      {
        id: "map-method",
        title: "예측 방법",
        startSec: 96,
        endSec: 245,
        summary: "쓴 데이터와 변수, 모델을 고른 과정을 설명해요.",
        segmentIds: ["seg-05", "sec-features", "seg-07", "sec-model"],
        difficultSectionIds: ["sec-features", "sec-model"],
      },
      {
        id: "map-close",
        title: "결론과 제안",
        startSec: 246,
        endSec: 372,
        summary: "절감 효과를 정리하고 2주 시범 운영을 제안해요.",
        segmentIds: ["seg-09", "sec-conclusion", "seg-11"],
        difficultSectionIds: ["sec-conclusion"],
      },
    ],
  },
  audienceHeatmap: {
    cells: [
      { sectionId: "map-problem", personaId: "p-beginner", reception: "clear", evidence: "버려진 우유 사진을 보니 바로 이해됐어요." },
      { sectionId: "map-problem", personaId: "p-peer", reception: "clear", evidence: "문제가 무엇인지 첫 30초에 잡혔어요." },
      { sectionId: "map-problem", personaId: "p-expert", reception: "clear", evidence: "한 달 열흘이라는 빈도가 문제 규모를 보여줬어요." },
      { sectionId: "map-result", personaId: "p-beginner", reception: "lost", evidence: "MAPE가 뭔지 몰라서 12.4%가 좋은 건지 판단할 수 없었어요." },
      { sectionId: "map-result", personaId: "p-peer", reception: "partial", evidence: "숫자는 들었는데 우리 가게에 어떤 의미인지 연결이 안 됐어요." },
      { sectionId: "map-result", personaId: "p-expert", reception: "clear", evidence: "익숙한 지표라 바로 이해했어요. 기준선만 궁금했어요." },
      { sectionId: "map-method", personaId: "p-beginner", reception: "lost", evidence: "‘이동평균’에서 멈췄고, 그 뒤는 거의 흘려들었어요." },
      { sectionId: "map-method", personaId: "p-peer", reception: "partial", evidence: "변수를 하나하나 듣다가 무엇이 중요한지 놓쳤어요." },
      { sectionId: "map-method", personaId: "p-expert", reception: "partial", evidence: "어떤 기간으로 검증했는지 없이 결론만 들렸어요." },
      { sectionId: "map-close", personaId: "p-beginner", reception: "clear", evidence: "2주 시범 운영 제안은 확실히 들었어요." },
      { sectionId: "map-close", personaId: "p-peer", reception: "partial", evidence: "가장 궁금했던 금액이 ‘참고로’ 뒤에 묻혀서 지나갔어요." },
      { sectionId: "map-close", personaId: "p-expert", reception: "clear", evidence: "다음 단계가 현실적이라 납득됐어요." },
    ],
  },
  discovery: {
    headline: "같은 ‘12.4% 개선’을 두고 전문가는 바로 이해했지만, 비전공 관중은 좋은 숫자인지조차 판단하지 못했어요.",
    detail: "지표 이름 대신 ‘하루에 몇 개 덜 버리는지’로 바꿔 말하면 세 관중이 같은 결론에 도착할 수 있어요.",
    sectionId: "map-result",
    difficultSectionId: "sec-metric",
    personaIds: ["p-expert", "p-beginner"],
  },
  keyMoments: [
    {
      id: "moment-1",
      kind: "interest_peak",
      startSec: 22,
      title: "관심이 가장 크게 올라간 구간",
      detail: "버려진 우유와 크루아상 사진에서 세 관중 모두 문제를 자기 일처럼 느꼈을 가능성이 높아요.",
      sectionId: "map-problem",
      personaIds: ["p-beginner", "p-peer", "p-expert"],
    },
    {
      id: "moment-2",
      kind: "first_drop",
      startSec: 48,
      title: "이해가 처음으로 떨어진 구간",
      detail: "‘MAPE 12.4%’가 정의 없이 나오면서 비전공 관중의 이해가 처음 흔들렸을 가능성이 높아요.",
      sectionId: "map-result",
      difficultSectionId: "sec-metric",
      personaIds: ["p-beginner", "p-peer"],
    },
    {
      id: "moment-3",
      kind: "common_question",
      startSec: 210,
      title: "여러 관중이 공통으로 질문을 가진 구간",
      detail: "모델 비교 결과만 나오자 일반·전문가 관중이 ‘무엇을 기준으로 더 잘 나왔는지’ 궁금해했을 가능성이 있어요.",
      sectionId: "map-method",
      difficultSectionId: "sec-model",
      personaIds: ["p-peer", "p-expert"],
    },
  ],
  naturalQuestions: [
    { id: "question-1", question: "12.4% 개선이면 하루에 몇 개를 덜 버리게 되나요?", personaIds: ["p-beginner", "p-peer"], sectionId: "map-result", startSec: 48 },
    { id: "question-2", question: "LightGBM이 더 잘 나왔다는 건 어떤 기간, 어떤 기준으로 비교한 건가요?", personaIds: ["p-peer", "p-expert"], sectionId: "map-method", startSec: 96 },
    { id: "question-3", question: "시범 운영 2주 동안 무엇을 보고 성공이라고 판단하나요?", personaIds: ["p-expert"], sectionId: "map-close", startSec: 246 },
  ],
};

/** A result where the audience followed everything — exercises the empty state. */
export const SAMPLE_RESULT_NO_ISSUES: AnalysisResult = {
  ...SAMPLE_RESULT,
  presentationId: "demo-empty",
  summary: {
    headline: "네 청중 모두 핵심 메시지를 이해했어요. 크게 막힌 지점은 발견되지 않았어요.",
    intendedKeyMessage: SAMPLE_RESULT.summary.intendedKeyMessage,
    strengths: SAMPLE_RESULT.summary.strengths,
  },
  personaFeedback: SAMPLE_RESULT.personaFeedback.map((f) => ({
    ...f,
    understanding: "followed",
    receivedKeyMessage: true,
    whereLost: [],
    difficultSectionIds: [],
  })),
  difficultSections: [],
  missingExplanations: [],
  exampleSuggestions: [],
  presentationMap: {
    sections: SAMPLE_RESULT.presentationMap!.sections.map((s) => ({ ...s, difficultSectionIds: [] })),
  },
  audienceHeatmap: {
    cells: SAMPLE_RESULT.audienceHeatmap!.cells.map((c) => ({ ...c, reception: "clear" as const, evidence: undefined })),
  },
  discovery: undefined,
  keyMoments: [SAMPLE_RESULT.keyMoments![0]!],
};

/** Phase 3 shape: no presentation map, heatmap or discovery. Legacy results must still read well. */
export const SAMPLE_RESULT_LEGACY: AnalysisResult = {
  ...SAMPLE_RESULT,
  presentationId: "demo-legacy",
  presentationMap: undefined,
  audienceHeatmap: undefined,
  discovery: undefined,
  keyMoments: undefined,
  naturalQuestions: undefined,
  difficultSections: SAMPLE_RESULT.difficultSections.map((section) => ({ ...section, cause: undefined, likelihood: undefined, pattern: undefined })),
};
