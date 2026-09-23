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
};
