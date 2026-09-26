import type { AnalysisResult, Persona } from "@/shared/api/types";
import { AUDIENCE_SEATS } from "@/lib/audience";
import type { ExhibitionDemoSource } from "./demo-adapter";

/**
 * Locally authored exhibition demos. Illustrative sample data only: none of it
 * comes from a real recording, and every result carries `isSample: true`.
 *
 * Placeholder for the data worker's catalog (`demo-catalog.ts`). The ids match
 * the agreed ones, so replacing this module only touches `demo-adapter.ts`.
 */

const PERSONAS: Persona[] = AUDIENCE_SEATS.map(({ kind, name, description, listensFor }) => ({
  id: `p-${kind}`,
  kind,
  name,
  description,
  listensFor,
}));

const ANALYZED_AT = "2026-09-27T00:00:00.000Z";

function transcriptOf(segments: NonNullable<AnalysisResult["transcript"]>["segments"]) {
  return { text: segments.map((s) => s.text).join(" "), segments };
}

// ---------------------------------------------------------------------------
// 1. BFS — 자료구조 수업 발표
// ---------------------------------------------------------------------------

const BFS_RESULT: AnalysisResult = {
  presentationId: "exhibition-bfs",
  title: "BFS로 지하철 최소 환승 경로 찾기",
  durationSec: 268,
  analyzedAt: ANALYZED_AT,
  isSample: true,
  summary: {
    headline: "지하철 예시는 모두 따라왔지만, ‘큐에 넣는다’는 설명부터 비전공 관중이 흐름을 놓쳤어요.",
    intendedKeyMessage: "BFS는 가까운 역부터 차례로 살펴서, 환승이 가장 적은 경로를 반드시 찾아낸다.",
    priorityFixSectionId: "ds-queue",
    strengths: [
      "익숙한 지하철 노선도로 문제를 시작해서 첫 1분에 관심을 모았어요.",
      "마지막에 핵심 메시지를 한 문장으로 다시 정리했어요.",
    ],
  },
  personas: PERSONAS,
  personaFeedback: [
    {
      personaId: "p-beginner",
      understanding: "partly_lost",
      receivedKeyMessage: false,
      reaction: "지하철로 시작할 때는 재밌었어요. 그런데 ‘큐’랑 ‘레벨’이 나오고부터는 왜 그 순서로 보는지 모르겠더라고요.",
      whatLanded: ["환승이 적은 길을 찾고 싶다는 문제"],
      whereLost: ["큐에 넣고 꺼내는 이유", "‘레벨 순서’라는 표현"],
      difficultSectionIds: ["ds-queue"],
    },
    {
      personaId: "p-peer",
      understanding: "followed",
      receivedKeyMessage: true,
      reaction: "전체 흐름은 이해했어요. 예시를 따라갈 때 역 이름이 빠르게 지나가서 잠깐 헷갈렸어요.",
      whatLanded: ["가까운 역부터 본다는 아이디어", "마지막 정리 문장"],
      whereLost: ["예시에서 역 이름이 빠르게 지나간 부분"],
      difficultSectionIds: ["ds-trace"],
    },
    {
      personaId: "p-expert",
      understanding: "partly_lost",
      receivedKeyMessage: true,
      reaction: "방문 표시를 언제 하는지가 빠져서, 같은 역을 두 번 넣는 구현이 될 수도 있어 보여요.",
      whatLanded: ["BFS가 최단 환승을 보장한다는 결론"],
      whereLost: ["방문 처리 시점", "시간 복잡도 언급 없음"],
      difficultSectionIds: ["ds-queue"],
    },
  ],
  difficultSections: [
    {
      id: "ds-queue",
      startSec: 58,
      endSec: 96,
      transcript: "시작역을 큐에 넣고, 하나씩 꺼내면서 연결된 역들을 다시 큐에 넣습니다. 그러면 자연스럽게 레벨 순서대로 탐색이 됩니다.",
      highlight: "자연스럽게 레벨 순서대로 탐색이 됩니다",
      category: "terminology",
      severity: "high",
      reactions: [
        { personaId: "p-beginner", reaction: "큐가 줄 서기라는 건 알겠는데, 왜 그게 ‘가까운 순서’가 되는지 연결이 안 됐어요." },
        { personaId: "p-expert", reaction: "넣을 때 방문 표시를 하는지, 꺼낼 때 하는지가 빠졌어요." },
      ],
      reason: "‘먼저 들어온 역이 먼저 나온다’는 규칙과 ‘가까운 역부터 본다’는 결과를 잇는 한 문장이 빠져 있고, ‘레벨’을 정의 없이 썼어요.",
      cause: "CONNECTION_CONFUSION",
      likelihood: "high",
      pattern: "비전공 관중은 큐의 규칙과 결과를 잇지 못했고, 전문가 관중은 방문 처리 시점이 빠진 것을 걱정했어요. 원인은 달라도 같은 문장에서 멈췄어요.",
      improvement: {
        suggestion: "‘레벨’ 대신 ‘환승 한 번으로 갈 수 있는 역들’처럼 말하고, 큐에 넣을 때 방문 표시를 한다고 덧붙이세요.",
        rewrite: "“먼저 줄 선 역부터 꺼내니까, 한 번 만에 가는 역들을 다 본 다음에야 두 번 만에 가는 역으로 넘어가요. 줄에 세울 때 ‘봤음’ 표시를 해서 같은 역을 두 번 세우지 않아요.”",
      },
    },
    {
      id: "ds-trace",
      startSec: 132,
      endSec: 176,
      transcript: "강남에서 출발하면 교대, 선릉, 역삼이 들어가고, 교대를 꺼내면 고속터미널, 남부터미널이 들어가고, 선릉을 꺼내면 한티, 삼성이 들어갑니다.",
      highlight: "교대를 꺼내면 고속터미널, 남부터미널이 들어가고, 선릉을 꺼내면 한티, 삼성이",
      category: "pace",
      severity: "medium",
      reactions: [{ personaId: "p-peer", reaction: "역 이름이 빠르게 쏟아져서 지금 큐에 뭐가 있는지 놓쳤어요." }],
      reason: "화면 없이 말로만 큐의 상태가 바뀌어서, 듣는 사람이 머릿속으로 줄을 계속 기억해야 해요.",
      cause: "EXAMPLE_GAP",
      likelihood: "likely",
      pattern: "예시 자체는 친숙했지만 상태 변화를 말로만 전달해서 일반 관중이 기억 부담을 느꼈을 가능성이 있어요.",
      improvement: {
        suggestion: "예시를 두 단계까지만 말하고, 매 단계 ‘지금 줄에는 무엇이 있다’고 짧게 정리해 주세요.",
        rewrite: "“지금 줄에는 교대, 선릉, 역삼이 서 있어요. 맨 앞의 교대를 꺼내 볼게요.”",
      },
    },
  ],
  missingExplanations: [
    {
      id: "me-queue",
      term: "큐",
      why: "비전공 관중이 큐의 규칙과 탐색 순서를 연결하지 못했어요.",
      suggestedExplanation: "먼저 들어온 것이 먼저 나오는 줄이에요. 매표소 줄처럼 앞사람부터 차례로 처리해요.",
      personaIds: ["p-beginner"],
      sectionId: "map-queue",
    },
    {
      id: "me-visited",
      term: "방문 표시 시점",
      why: "전문가 관중이 중복 탐색 가능성을 지적했어요.",
      suggestedExplanation: "역을 큐에 넣는 순간 방문했다고 표시해야 같은 역을 두 번 넣지 않아요.",
      personaIds: ["p-expert"],
      sectionId: "map-queue",
    },
  ],
  exampleSuggestions: [
    {
      id: "ex-ripple",
      concept: "BFS가 가까운 곳부터 퍼지는 모습",
      example: "“호수에 돌을 던지면 물결이 가까운 곳부터 한 겹씩 퍼지죠. BFS도 시작역에서 환승 한 번, 두 번… 한 겹씩 넓혀 가요.”",
      personaIds: ["p-beginner", "p-peer"],
      sectionId: "map-queue",
    },
  ],
  transcript: transcriptOf([
    { id: "b-01", startSec: 0, endSec: 28, text: "여러분, 강남에서 잠실까지 환승을 가장 적게 하는 길을 어떻게 찾을까요?" },
    { id: "b-02", startSec: 28, endSec: 57, text: "노선도를 역과 역을 잇는 그래프로 보면, 이 문제는 그래프 탐색 문제가 됩니다." },
    { id: "ds-queue", startSec: 58, endSec: 96, text: "시작역을 큐에 넣고, 하나씩 꺼내면서 연결된 역들을 다시 큐에 넣습니다. 그러면 자연스럽게 레벨 순서대로 탐색이 됩니다." },
    { id: "b-04", startSec: 96, endSec: 131, text: "이 방식을 너비 우선 탐색, BFS라고 부릅니다." },
    { id: "ds-trace", startSec: 132, endSec: 176, text: "강남에서 출발하면 교대, 선릉, 역삼이 들어가고, 교대를 꺼내면 고속터미널, 남부터미널이 들어가고, 선릉을 꺼내면 한티, 삼성이 들어갑니다." },
    { id: "b-06", startSec: 176, endSec: 222, text: "이렇게 잠실이 처음 꺼내지는 순간이 바로 환승이 가장 적은 경로예요." },
    { id: "b-07", startSec: 222, endSec: 268, text: "정리하면, BFS는 가까운 역부터 차례로 살펴서 가장 적게 갈아타는 길을 반드시 찾아냅니다. 감사합니다." },
  ]),
  presentationMap: {
    sections: [
      { id: "map-problem", title: "문제 제기", startSec: 0, endSec: 57, summary: "환승이 적은 길 찾기를 그래프 문제로 바꿔요.", segmentIds: ["b-01", "b-02"], difficultSectionIds: [] },
      { id: "map-queue", title: "큐와 탐색 순서", startSec: 58, endSec: 131, summary: "큐로 가까운 역부터 살피는 원리를 설명해요.", segmentIds: ["ds-queue", "b-04"], difficultSectionIds: ["ds-queue"] },
      { id: "map-trace", title: "예시 따라가기", startSec: 132, endSec: 222, summary: "강남에서 잠실까지 탐색 과정을 따라가요.", segmentIds: ["ds-trace", "b-06"], difficultSectionIds: ["ds-trace"] },
      { id: "map-close", title: "정리", startSec: 222, endSec: 268, summary: "BFS가 최소 환승을 보장한다고 정리해요.", segmentIds: ["b-07"], difficultSectionIds: [] },
    ],
  },
  audienceHeatmap: {
    cells: [
      { sectionId: "map-problem", personaId: "p-beginner", reception: "clear", evidence: "지하철 환승은 매일 겪는 일이라 바로 와닿았어요." },
      { sectionId: "map-problem", personaId: "p-peer", reception: "clear", evidence: "노선도를 그래프로 본다는 게 깔끔했어요." },
      { sectionId: "map-problem", personaId: "p-expert", reception: "clear", evidence: "문제 정의가 명확했어요." },
      { sectionId: "map-queue", personaId: "p-beginner", reception: "lost", evidence: "왜 줄을 세우면 가까운 순서가 되는지 모르겠어요." },
      { sectionId: "map-queue", personaId: "p-peer", reception: "clear", evidence: "먼저 넣은 걸 먼저 꺼낸다는 건 이해했어요." },
      { sectionId: "map-queue", personaId: "p-expert", reception: "partial", evidence: "방문 표시를 언제 하는지가 빠졌어요." },
      { sectionId: "map-trace", personaId: "p-beginner", reception: "partial", evidence: "역 이름은 아는데 순서가 왜 그런지는 흐릿해요." },
      { sectionId: "map-trace", personaId: "p-peer", reception: "partial", evidence: "역 이름이 빠르게 쏟아져서 줄 상태를 놓쳤어요." },
      { sectionId: "map-trace", personaId: "p-expert", reception: "clear", evidence: "탐색 순서가 정확했어요." },
      { sectionId: "map-close", personaId: "p-beginner", reception: "partial", evidence: "‘반드시 찾는다’는 건 들었지만 이유는 모르겠어요." },
      { sectionId: "map-close", personaId: "p-peer", reception: "clear", evidence: "마지막 한 문장으로 정리돼서 좋았어요." },
      { sectionId: "map-close", personaId: "p-expert", reception: "clear", evidence: "결론은 타당해요. 복잡도도 한마디 있으면 좋겠어요." },
    ],
  },
  discovery: {
    headline: "같은 ‘큐에 넣는다’를 두고 일반 관중은 바로 따라왔지만, 비전공 관중은 왜 그 순서가 되는지부터 놓쳤어요.",
    detail: "‘환승 한 번으로 가는 역들을 먼저 다 본다’는 한 문장을 넣으면 세 관중이 같은 그림을 그릴 수 있어요.",
    sectionId: "map-queue",
    difficultSectionId: "ds-queue",
    personaIds: ["p-peer", "p-beginner"],
  },
  keyMoments: [
    { id: "bfs-m1", kind: "interest_peak", startSec: 0, title: "관심이 가장 크게 올라간 구간", detail: "매일 타는 지하철 질문으로 시작해서 세 관중 모두 문제를 자기 일처럼 느꼈을 가능성이 높아요.", sectionId: "map-problem", personaIds: ["p-beginner", "p-peer", "p-expert"] },
    { id: "bfs-m2", kind: "first_drop", startSec: 58, title: "이해가 처음으로 떨어진 구간", detail: "‘레벨 순서’가 정의 없이 나오면서 비전공 관중의 이해가 처음 흔들렸을 가능성이 높아요.", sectionId: "map-queue", difficultSectionId: "ds-queue", personaIds: ["p-beginner"] },
  ],
  naturalQuestions: [
    { id: "bfs-q1", question: "줄을 세우면 왜 가까운 역부터 보게 되나요?", personaIds: ["p-beginner"], sectionId: "map-queue", startSec: 58 },
    { id: "bfs-q2", question: "같은 역이 큐에 두 번 들어가지 않게 하려면 언제 방문 표시를 하나요?", personaIds: ["p-expert"], sectionId: "map-queue", startSec: 58 },
  ],
};

// ---------------------------------------------------------------------------
// 2. AI 윤리 — 교양 수업 토론 발표
// ---------------------------------------------------------------------------

const AI_ETHICS_RESULT: AnalysisResult = {
  presentationId: "exhibition-ai-ethics",
  title: "채용 AI, 공정하다고 말할 수 있을까",
  durationSec: 304,
  analyzedAt: ANALYZED_AT,
  isSample: true,
  summary: {
    headline: "실제 채용 사례에는 모두 몰입했지만, 공정성 기준 두 가지가 한꺼번에 나오면서 결론이 흐려졌어요.",
    intendedKeyMessage: "채용 AI는 ‘무엇을 공정하다고 볼지’ 먼저 정하고 사람이 최종 판단해야 한다.",
    priorityFixSectionId: "ds-fairness",
    strengths: [
      "실제 기업 사례로 시작해서 문제의식이 분명했어요.",
      "찬반을 모두 소개해서 한쪽으로 치우치지 않았어요.",
    ],
  },
  personas: PERSONAS,
  personaFeedback: [
    {
      personaId: "p-beginner",
      understanding: "partly_lost",
      receivedKeyMessage: false,
      reaction: "AI가 여성 지원자를 떨어뜨렸다는 얘기는 충격이었어요. 그런데 ‘대리 변수’부터는 무슨 말인지 잘 모르겠어요.",
      whatLanded: ["채용 AI가 편향될 수 있다는 사례"],
      whereLost: ["대리 변수라는 말", "공정성 기준 두 가지의 차이"],
      difficultSectionIds: ["ds-proxy", "ds-fairness"],
    },
    {
      personaId: "p-peer",
      understanding: "partly_lost",
      receivedKeyMessage: false,
      reaction: "문제는 공감했는데, 그래서 발표자가 원하는 결론이 규제인지 사람 검토인지 헷갈렸어요.",
      whatLanded: ["사례와 문제의식"],
      whereLost: ["공정성 기준 비교", "마지막 제안이 무엇인지"],
      difficultSectionIds: ["ds-fairness", "ds-ask"],
    },
    {
      personaId: "p-expert",
      understanding: "followed",
      receivedKeyMessage: true,
      reaction: "기준을 정확히 짚었어요. 다만 두 기준이 동시에 만족될 수 없다는 점을 근거와 함께 말하면 더 설득력 있겠어요.",
      whatLanded: ["대리 변수 개념", "공정성 기준 간 충돌"],
      whereLost: [],
      difficultSectionIds: [],
    },
  ],
  difficultSections: [
    {
      id: "ds-proxy",
      startSec: 74,
      endSec: 112,
      transcript: "성별을 입력에서 빼도 편향은 사라지지 않습니다. 출신 동아리나 취미 같은 대리 변수가 성별 정보를 대신 담고 있기 때문입니다.",
      highlight: "대리 변수가 성별 정보를 대신 담고 있기 때문입니다",
      category: "terminology",
      severity: "medium",
      reactions: [{ personaId: "p-beginner", reaction: "‘대리 변수’가 무슨 뜻인지 몰라서 왜 편향이 남는지 이해가 안 됐어요." }],
      reason: "‘대리 변수’라는 용어를 쓰기 전에 ‘다른 정보가 성별을 짐작하게 한다’는 쉬운 설명이 없어요.",
      cause: "TERM_CONFUSION",
      likelihood: "likely",
      pattern: "전문가 관중은 용어를 바로 알아들었지만 비전공 관중은 단어에서 멈췄을 가능성이 높아요.",
      improvement: {
        suggestion: "용어보다 예를 먼저 말하고, 용어는 뒤에 이름표처럼 붙이세요.",
        rewrite: "“성별 칸을 지워도 ‘여대 동아리’ 같은 이력이 성별을 짐작하게 해요. 이런 걸 대리 변수라고 불러요.”",
      },
    },
    {
      id: "ds-fairness",
      startSec: 150,
      endSec: 198,
      transcript: "공정성에는 통계적 동등성과 기회 균등이라는 기준이 있는데, 두 기준은 동시에 만족하기 어렵고 상황에 따라 선택해야 합니다.",
      highlight: "통계적 동등성과 기회 균등이라는 기준이 있는데, 두 기준은 동시에 만족하기 어렵고",
      category: "abstract",
      severity: "high",
      reactions: [
        { personaId: "p-beginner", reaction: "두 이름이 한꺼번에 나와서 뭐가 다른지 구분이 안 됐어요." },
        { personaId: "p-peer", reaction: "왜 동시에 안 되는지 설명 없이 넘어가서 결론이 약해 보였어요." },
      ],
      reason: "추상적인 기준 두 개를 정의 없이 한 문장에 담았고, 충돌하는 이유를 보여주는 예시가 빠져 있어요.",
      cause: "CONCEPT_CONFUSION",
      likelihood: "high",
      pattern: "전문가 관중은 두 기준을 이미 알고 있어 바로 이해했지만, 비전공·일반 관중은 차이도 충돌 이유도 잡지 못했을 가능성이 높아요.",
      improvement: {
        suggestion: "두 기준을 합격자 수 예시 하나로 나란히 보여 주고, 왜 둘 다 맞출 수 없는지 한 문장으로 말하세요.",
        rewrite: "“합격자를 남녀 같은 비율로 뽑는 게 첫 번째 기준, 실력이 같으면 같은 확률로 붙게 하는 게 두 번째 기준이에요. 지원자 구성이 다르면 둘을 동시에 맞출 수 없어요.”",
      },
    },
    {
      id: "ds-ask",
      startSec: 262,
      endSec: 304,
      transcript: "결국 기술만의 문제가 아니라 사회적 합의가 필요하고, 여러 방면의 노력이 함께 이루어져야 한다고 생각합니다.",
      highlight: "여러 방면의 노력이 함께 이루어져야",
      category: "key_message",
      severity: "medium",
      reactions: [{ personaId: "p-peer", reaction: "그래서 구체적으로 뭘 하자는 건지 남지 않았어요." }],
      reason: "결론이 ‘여러 방면의 노력’으로 흐려져서, 발표 초반에 준비한 핵심 제안(사람의 최종 판단)이 전달되지 않아요.",
      cause: "PURPOSE_CONFUSION",
      likelihood: "likely",
      pattern: "일반 관중은 결론에서 행동할 거리를 찾았지만 추상적인 표현만 남아 핵심 메시지를 놓쳤을 가능성이 있어요.",
      improvement: {
        suggestion: "마지막 문장을 하나의 구체적 제안으로 바꾸세요.",
        rewrite: "“그래서 제안합니다. 채용 AI는 서류를 추려 주는 데까지만 쓰고, 탈락 결정은 반드시 사람이 확인해야 합니다.”",
      },
    },
  ],
  missingExplanations: [
    {
      id: "me-proxy",
      term: "대리 변수",
      why: "비전공 관중이 편향이 남는 이유를 이해하지 못했어요.",
      suggestedExplanation: "직접 쓰지 않은 정보(성별)를 대신 짐작하게 만드는 다른 정보예요.",
      personaIds: ["p-beginner"],
      sectionId: "map-cause",
    },
  ],
  exampleSuggestions: [
    {
      id: "ex-fairness",
      concept: "두 공정성 기준이 부딪히는 이유",
      example: "“지원자가 남자 80명, 여자 20명이라면, 합격자를 5:5로 맞추는 것과 실력만 보고 뽑는 것은 결과가 달라질 수밖에 없어요.”",
      personaIds: ["p-beginner", "p-peer"],
      sectionId: "map-criteria",
    },
  ],
  transcript: transcriptOf([
    { id: "a-01", startSec: 0, endSec: 36, text: "한 글로벌 기업이 채용 AI를 도입했다가, 여성 지원자에게 불리하게 점수를 매긴다는 사실이 드러나 사용을 중단했습니다." },
    { id: "a-02", startSec: 36, endSec: 73, text: "AI는 과거 합격자 데이터를 배웠고, 그 데이터가 이미 한쪽으로 치우쳐 있었던 거죠." },
    { id: "ds-proxy", startSec: 74, endSec: 112, text: "성별을 입력에서 빼도 편향은 사라지지 않습니다. 출신 동아리나 취미 같은 대리 변수가 성별 정보를 대신 담고 있기 때문입니다." },
    { id: "a-04", startSec: 112, endSec: 149, text: "그렇다면 AI가 공정하다는 건 무엇을 뜻할까요?" },
    { id: "ds-fairness", startSec: 150, endSec: 198, text: "공정성에는 통계적 동등성과 기회 균등이라는 기준이 있는데, 두 기준은 동시에 만족하기 어렵고 상황에 따라 선택해야 합니다." },
    { id: "a-06", startSec: 198, endSec: 261, text: "찬성하는 쪽은 사람보다 일관된 판단을, 반대하는 쪽은 책임 소재가 흐려진다는 점을 듭니다." },
    { id: "ds-ask", startSec: 262, endSec: 304, text: "결국 기술만의 문제가 아니라 사회적 합의가 필요하고, 여러 방면의 노력이 함께 이루어져야 한다고 생각합니다." },
  ]),
  presentationMap: {
    sections: [
      { id: "map-case", title: "사례 소개", startSec: 0, endSec: 73, summary: "채용 AI가 편향된 판단을 내린 실제 사례를 보여줘요.", segmentIds: ["a-01", "a-02"], difficultSectionIds: [] },
      { id: "map-cause", title: "편향의 원인", startSec: 74, endSec: 149, summary: "성별을 지워도 편향이 남는 이유를 설명해요.", segmentIds: ["ds-proxy", "a-04"], difficultSectionIds: ["ds-proxy"] },
      { id: "map-criteria", title: "공정성 기준", startSec: 150, endSec: 261, summary: "공정성을 재는 두 기준과 찬반 논리를 소개해요.", segmentIds: ["ds-fairness", "a-06"], difficultSectionIds: ["ds-fairness"] },
      { id: "map-proposal", title: "결론과 제안", startSec: 262, endSec: 304, summary: "사회적 합의가 필요하다고 마무리해요.", segmentIds: ["ds-ask"], difficultSectionIds: ["ds-ask"] },
    ],
  },
  audienceHeatmap: {
    cells: [
      { sectionId: "map-case", personaId: "p-beginner", reception: "clear", evidence: "실제 기업 이야기라 바로 몰입했어요." },
      { sectionId: "map-case", personaId: "p-peer", reception: "clear", evidence: "문제가 분명하게 잡혔어요." },
      { sectionId: "map-case", personaId: "p-expert", reception: "clear", evidence: "잘 알려진 사례를 정확히 짚었어요." },
      { sectionId: "map-cause", personaId: "p-beginner", reception: "lost", evidence: "‘대리 변수’에서 멈췄어요." },
      { sectionId: "map-cause", personaId: "p-peer", reception: "partial", evidence: "동아리가 왜 성별이랑 연결되는지 잠깐 헷갈렸어요." },
      { sectionId: "map-cause", personaId: "p-expert", reception: "clear", evidence: "편향이 남는 원리를 정확히 설명했어요." },
      { sectionId: "map-criteria", personaId: "p-beginner", reception: "lost", evidence: "두 기준 이름이 한꺼번에 나와서 구분이 안 됐어요." },
      { sectionId: "map-criteria", personaId: "p-peer", reception: "partial", evidence: "왜 동시에 안 되는지 설명이 없었어요." },
      { sectionId: "map-criteria", personaId: "p-expert", reception: "clear", evidence: "기준 충돌을 짚은 건 좋았어요. 근거가 조금 더 있으면 좋겠어요." },
      { sectionId: "map-proposal", personaId: "p-beginner", reception: "partial", evidence: "뭔가 노력이 필요하다는 건 들었어요." },
      { sectionId: "map-proposal", personaId: "p-peer", reception: "lost", evidence: "그래서 뭘 하자는 건지 남지 않았어요." },
      { sectionId: "map-proposal", personaId: "p-expert", reception: "partial", evidence: "앞에서 준비한 제안이 결론에서 흐려졌어요." },
    ],
  },
  discovery: {
    headline: "공정성 기준 두 가지를 전문가는 바로 알아들었지만, 비전공 관중은 이름만 듣고 차이를 잡지 못했어요.",
    detail: "지원자 100명 예시 하나로 두 기준을 나란히 보여 주면 결론의 설득력도 함께 올라가요.",
    sectionId: "map-criteria",
    difficultSectionId: "ds-fairness",
    personaIds: ["p-expert", "p-beginner"],
  },
  keyMoments: [
    { id: "eth-m1", kind: "interest_peak", startSec: 0, title: "관심이 가장 크게 올라간 구간", detail: "실제 기업의 채용 AI 중단 사례에서 세 관중 모두 몰입했을 가능성이 높아요.", sectionId: "map-case", personaIds: ["p-beginner", "p-peer", "p-expert"] },
    { id: "eth-m2", kind: "first_drop", startSec: 74, title: "이해가 처음으로 떨어진 구간", detail: "‘대리 변수’가 설명 없이 나오면서 비전공 관중이 처음 흐름을 놓쳤을 가능성이 높아요.", sectionId: "map-cause", difficultSectionId: "ds-proxy", personaIds: ["p-beginner"] },
    { id: "eth-m3", kind: "common_question", startSec: 262, title: "여러 관중이 공통으로 질문을 가진 구간", detail: "결론이 흐려지면서 일반·전문가 관중 모두 ‘그래서 무엇을 하자는 건지’ 궁금해했을 가능성이 있어요.", sectionId: "map-proposal", difficultSectionId: "ds-ask", personaIds: ["p-peer", "p-expert"] },
  ],
  naturalQuestions: [
    { id: "eth-q1", question: "두 공정성 기준 중에서 채용에는 어느 쪽이 맞나요?", personaIds: ["p-peer", "p-expert"], sectionId: "map-criteria", startSec: 150 },
    { id: "eth-q2", question: "결국 채용 AI를 쓰자는 건가요, 쓰지 말자는 건가요?", personaIds: ["p-beginner", "p-peer"], sectionId: "map-proposal", startSec: 262 },
  ],
};

// ---------------------------------------------------------------------------
// 3. 학교 프로젝트 — 조별 과제 결과 발표
// ---------------------------------------------------------------------------

const SCHOOL_PROJECT_RESULT: AnalysisResult = {
  presentationId: "exhibition-school-project",
  title: "교내 분리수거 개선 프로젝트 결과 보고",
  durationSec: 236,
  analyzedAt: ANALYZED_AT,
  isSample: true,
  summary: {
    headline: "문제와 해결책은 잘 전달됐지만, 결과 숫자가 연달아 나오면서 무엇이 가장 큰 성과인지 흐려졌어요.",
    intendedKeyMessage: "분리수거함에 그림 안내를 붙였더니 잘못 버린 쓰레기가 절반으로 줄었다.",
    priorityFixSectionId: "ds-numbers",
    strengths: [
      "급식실 앞 쓰레기통 사진으로 문제를 바로 보여줬어요.",
      "다음 학기 계획을 역할과 날짜까지 구체적으로 말했어요.",
    ],
  },
  personas: PERSONAS,
  personaFeedback: [
    {
      personaId: "p-beginner",
      understanding: "followed",
      receivedKeyMessage: true,
      reaction: "그림 안내를 붙였다는 해결책이 쉽고 좋았어요. 숫자가 많이 나올 때는 조금 흘려들었어요.",
      whatLanded: ["문제 사진", "그림 안내라는 해결책"],
      whereLost: ["결과 숫자 여러 개"],
      difficultSectionIds: ["ds-numbers"],
    },
    {
      personaId: "p-peer",
      understanding: "partly_lost",
      receivedKeyMessage: false,
      reaction: "숫자가 다섯 개쯤 이어져서, 결국 얼마나 좋아졌다는 건지 한 문장으로 말하기 어려웠어요.",
      whatLanded: ["프로젝트를 한 이유", "다음 학기 계획"],
      whereLost: ["결과 중 가장 중요한 숫자"],
      difficultSectionIds: ["ds-numbers"],
    },
    {
      personaId: "p-expert",
      understanding: "partly_lost",
      receivedKeyMessage: true,
      reaction: "결과는 흥미로운데, 설문을 몇 명에게 언제 했는지가 없어서 숫자를 믿어도 될지 모르겠어요.",
      whatLanded: ["실험 전후 비교 구조"],
      whereLost: ["조사 대상과 기간"],
      difficultSectionIds: ["ds-method"],
    },
  ],
  difficultSections: [
    {
      id: "ds-method",
      startSec: 52,
      endSec: 88,
      transcript: "저희는 설문과 관찰을 통해 분리수거 실태를 조사했고, 개선 전후를 비교했습니다.",
      highlight: "설문과 관찰을 통해 분리수거 실태를 조사했고",
      category: "missing_context",
      severity: "medium",
      reactions: [{ personaId: "p-expert", reaction: "몇 명에게, 얼마 동안 조사했는지가 빠졌어요." }],
      reason: "조사 대상 수와 기간이 없어서 뒤에 나오는 결과 숫자를 얼마나 믿을지 판단할 근거가 부족해요.",
      cause: "CONTEXT_GAP",
      likelihood: "likely",
      pattern: "전문가 관중은 숫자의 근거를 찾았지만, 비전공·일반 관중은 방법 부분을 크게 신경 쓰지 않았을 가능성이 있어요.",
      improvement: {
        suggestion: "조사 규모와 기간을 한 문장으로 덧붙이세요.",
        rewrite: "“2주 동안 점심시간마다 급식실 앞 분리수거함 네 개를 직접 세어 봤고, 전교생 120명에게 설문도 받았어요.”",
      },
    },
    {
      id: "ds-numbers",
      startSec: 118,
      endSec: 164,
      transcript: "개선 후 일반쓰레기 혼입률은 38%에서 17%로, 플라스틱 오분류는 24%에서 11%로 줄었고, 설문 인지도는 42%에서 76%로, 만족도는 3.1에서 4.2로 올랐습니다.",
      highlight: "38%에서 17%로, 플라스틱 오분류는 24%에서 11%로 줄었고, 설문 인지도는 42%에서 76%로",
      category: "structure",
      severity: "high",
      reactions: [
        { personaId: "p-peer", reaction: "숫자가 너무 많아서 무엇이 핵심인지 놓쳤어요." },
        { personaId: "p-beginner", reaction: "좋아졌다는 건 알겠는데 숫자는 기억이 안 나요." },
      ],
      reason: "여덟 개의 수치를 한 문장에 이어 말해서, 핵심 메시지인 ‘잘못 버린 쓰레기가 절반으로 줄었다’가 묻혀요.",
      cause: "CONNECTION_CONFUSION",
      likelihood: "high",
      pattern: "숫자 하나하나는 쉬웠지만 우선순위 없이 이어져서, 배경지식과 관계없이 비전공·일반 관중이 핵심을 스스로 골라내야 했을 가능성이 높아요.",
      improvement: {
        suggestion: "가장 중요한 숫자 하나만 먼저 말하고, 나머지는 화면에 표로 남기세요.",
        rewrite: "“가장 큰 변화부터 말씀드릴게요. 잘못 버린 쓰레기가 절반 넘게 줄었어요. 나머지 결과는 화면의 표로 정리했어요.”",
      },
    },
  ],
  missingExplanations: [
    {
      id: "me-mix-rate",
      term: "혼입률",
      why: "비전공 관중이 숫자가 무엇을 뜻하는지 바로 떠올리지 못했어요.",
      suggestedExplanation: "재활용함에 잘못 들어간 일반쓰레기의 비율이에요. 낮을수록 잘 분리한 거예요.",
      personaIds: ["p-beginner"],
      sectionId: "map-result",
    },
  ],
  exampleSuggestions: [
    {
      id: "ex-half",
      concept: "혼입률 38% → 17%의 의미",
      example: "“예전엔 재활용함 10개를 열면 네 개에 일반쓰레기가 섞여 있었는데, 이제는 두 개 정도예요.”",
      personaIds: ["p-beginner", "p-peer"],
      sectionId: "map-result",
    },
  ],
  transcript: transcriptOf([
    { id: "s-01", startSec: 0, endSec: 26, text: "이 사진은 지난 4월 급식실 앞 분리수거함이에요. 플라스틱 칸에 음식물이 그대로 들어가 있죠." },
    { id: "s-02", startSec: 26, endSec: 51, text: "저희 조는 안내문이 글로만 되어 있어서 학생들이 잘 안 읽는다는 점에 주목했습니다." },
    { id: "ds-method", startSec: 52, endSec: 88, text: "저희는 설문과 관찰을 통해 분리수거 실태를 조사했고, 개선 전후를 비교했습니다." },
    { id: "s-04", startSec: 88, endSec: 117, text: "개선 방법은 간단합니다. 칸마다 버려도 되는 물건을 그림으로 붙였어요." },
    { id: "ds-numbers", startSec: 118, endSec: 164, text: "개선 후 일반쓰레기 혼입률은 38%에서 17%로, 플라스틱 오분류는 24%에서 11%로 줄었고, 설문 인지도는 42%에서 76%로, 만족도는 3.1에서 4.2로 올랐습니다." },
    { id: "s-06", startSec: 164, endSec: 200, text: "다음 학기에는 학생회와 함께 다른 층 분리수거함에도 그림 안내를 붙일 계획입니다." },
    { id: "s-07", startSec: 200, endSec: 236, text: "3월 첫 주에 설치하고, 한 달 뒤 같은 방식으로 다시 확인하겠습니다. 감사합니다." },
  ]),
  presentationMap: {
    sections: [
      { id: "map-problem", title: "문제 발견", startSec: 0, endSec: 51, summary: "급식실 분리수거함 사진으로 문제를 보여줘요.", segmentIds: ["s-01", "s-02"], difficultSectionIds: [] },
      { id: "map-method", title: "조사와 해결책", startSec: 52, endSec: 117, summary: "조사 방법과 그림 안내라는 해결책을 소개해요.", segmentIds: ["ds-method", "s-04"], difficultSectionIds: ["ds-method"] },
      { id: "map-result", title: "개선 결과", startSec: 118, endSec: 164, summary: "개선 전후 수치를 비교해요.", segmentIds: ["ds-numbers"], difficultSectionIds: ["ds-numbers"] },
      { id: "map-next", title: "다음 계획", startSec: 164, endSec: 236, summary: "다음 학기 확대 계획을 말해요.", segmentIds: ["s-06", "s-07"], difficultSectionIds: [] },
    ],
  },
  audienceHeatmap: {
    cells: [
      { sectionId: "map-problem", personaId: "p-beginner", reception: "clear", evidence: "사진 한 장으로 바로 이해됐어요." },
      { sectionId: "map-problem", personaId: "p-peer", reception: "clear", evidence: "안내문을 안 읽는다는 지적에 공감했어요." },
      { sectionId: "map-problem", personaId: "p-expert", reception: "clear", evidence: "문제 원인을 구체적으로 짚었어요." },
      { sectionId: "map-method", personaId: "p-beginner", reception: "clear", evidence: "그림을 붙였다는 게 쉽고 좋았어요." },
      { sectionId: "map-method", personaId: "p-peer", reception: "clear", evidence: "해결책이 간단해서 기억에 남아요." },
      { sectionId: "map-method", personaId: "p-expert", reception: "partial", evidence: "몇 명에게, 얼마 동안 조사했는지가 빠졌어요." },
      { sectionId: "map-result", personaId: "p-beginner", reception: "partial", evidence: "좋아졌다는 건 알겠는데 숫자는 기억이 안 나요." },
      { sectionId: "map-result", personaId: "p-peer", reception: "lost", evidence: "숫자가 너무 많아서 무엇이 핵심인지 놓쳤어요." },
      { sectionId: "map-result", personaId: "p-expert", reception: "partial", evidence: "조사 규모를 모르니 숫자를 믿어도 될지 모르겠어요." },
      { sectionId: "map-next", personaId: "p-beginner", reception: "clear", evidence: "다음 계획이 구체적이었어요." },
      { sectionId: "map-next", personaId: "p-peer", reception: "clear", evidence: "날짜까지 말해서 믿음이 갔어요." },
      { sectionId: "map-next", personaId: "p-expert", reception: "clear", evidence: "같은 방식으로 다시 확인한다는 점이 좋았어요." },
    ],
  },
  discovery: {
    headline: "가장 자랑하고 싶던 결과 구간에서, 세 관중 모두 핵심 숫자를 한 문장으로 말하지 못했어요.",
    detail: "‘잘못 버린 쓰레기가 절반으로 줄었다’ 한 문장을 먼저 말하고 나머지는 표로 넘기면 성과가 또렷해져요.",
    sectionId: "map-result",
    difficultSectionId: "ds-numbers",
    personaIds: ["p-beginner", "p-peer", "p-expert"],
  },
  keyMoments: [
    { id: "sch-m1", kind: "interest_peak", startSec: 0, title: "관심이 가장 크게 올라간 구간", detail: "급식실 앞 분리수거함 사진에서 세 관중 모두 문제를 바로 알아봤을 가능성이 높아요.", sectionId: "map-problem", personaIds: ["p-beginner", "p-peer", "p-expert"] },
    { id: "sch-m2", kind: "first_drop", startSec: 118, title: "이해가 처음으로 떨어진 구간", detail: "여덟 개의 수치가 이어지면서 일반 관중이 핵심을 놓쳤을 가능성이 높아요.", sectionId: "map-result", difficultSectionId: "ds-numbers", personaIds: ["p-peer", "p-beginner"] },
  ],
  naturalQuestions: [
    { id: "sch-q1", question: "설문은 몇 명에게, 언제 받았나요?", personaIds: ["p-expert"], sectionId: "map-method", startSec: 52 },
    { id: "sch-q2", question: "그래서 가장 크게 달라진 건 무엇인가요?", personaIds: ["p-peer", "p-beginner"], sectionId: "map-result", startSec: 118 },
  ],
};

export const FALLBACK_DEMOS: readonly ExhibitionDemoSource[] = [
  {
    id: "bfs",
    title: "BFS 알고리즘 설명",
    tagline: "자료구조 수업에서 너비 우선 탐색을 설명하는 발표",
    context: {
      speaker: "컴퓨터공학과 2학년",
      situation: "자료구조 수업 · 조별 개념 발표",
      audience: "수강생과 교수님",
      excerpt: "시작역을 큐에 넣고, 하나씩 꺼내면서 연결된 역들을 다시 큐에 넣습니다.",
    },
    result: BFS_RESULT,
  },
  {
    id: "ai-ethics",
    title: "AI 윤리 토론",
    tagline: "채용 AI의 공정성을 다루는 교양 수업 토론 발표",
    context: {
      speaker: "교양 수업 수강생",
      situation: "‘기술과 사회’ 수업 · 토론 발제",
      audience: "다양한 전공의 수강생",
      excerpt: "공정성에는 통계적 동등성과 기회 균등이라는 기준이 있는데…",
    },
    result: AI_ETHICS_RESULT,
  },
  {
    id: "school-project",
    title: "학교 프로젝트 발표",
    tagline: "분리수거 개선 프로젝트의 결과를 보고하는 발표",
    context: {
      speaker: "고등학교 2학년 조별 팀",
      situation: "창의적 체험활동 · 프로젝트 결과 보고",
      audience: "같은 학년 학생과 담당 선생님",
      excerpt: "개선 후 일반쓰레기 혼입률은 38%에서 17%로, 플라스틱 오분류는 24%에서 11%로…",
    },
    result: SCHOOL_PROJECT_RESULT,
  },
];
