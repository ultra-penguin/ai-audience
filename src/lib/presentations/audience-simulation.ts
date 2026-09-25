import { z } from "zod";
import type { StructureSection } from "./schemas";

/**
 * Persona-based cognitive audience simulation.
 *
 * The model is never asked to grade the talk. Each persona is a cognitive
 * model (what it knows, wants and tolerates); the model walks the talk section
 * by section, updates that listener's state and only reports meaningful
 * changes. Everything that decides what reaches the presenter — salience,
 * priority, key moments, the 3–5 issue cap — runs here in code so it stays
 * deterministic and testable.
 */

export type PersonaId = "beginner" | "peer" | "specialist";

export type PersonaCognitiveModel = {
  identity: { role: string; ageGroup: string; background: string };
  knowledge: { domainKnowledge: string; knownConcepts: string[]; unknownConcepts: string[] };
  goal: { primary: string; secondary: string };
  cognitiveBehavior: {
    jargonTolerance: string;
    abstractionTolerance: string;
    inferenceTendency: string;
    questionTendency: string;
    patience: string;
  };
  attention: { initialAttention: string; attentionTriggers: string[]; attentionDropFactors: string[] };
  expectation: { expectedInformation: string[]; expectedDepth: string };
  decisionRules: { importantIssues: string[]; ignoreConditions: string[] };
};

/** Topic-agnostic: the talk's subject is unknown until it is heard, so knowledge is described relative to "the talk's field". */
export const PERSONA_MODELS: Record<PersonaId, PersonaCognitiveModel> = {
  beginner: {
    identity: { role: "발표 주제와 다른 분야를 공부하거나 일하는 사람", ageGroup: "20~30대", background: "대학 교양 수준의 상식과 일상적인 앱·서비스 사용 경험이 있음" },
    knowledge: {
      domainKnowledge: "발표 분야의 전문 지식은 거의 없음",
      knownConcepts: ["일상에서 쓰는 서비스의 겉모습과 사용 경험", "기본적인 숫자·비율 해석", "문제 → 해결 → 결과라는 일반적인 이야기 흐름"],
      unknownConcepts: ["발표 분야의 전문 용어와 약어", "분야 내부의 작동 원리", "업계에서 당연하게 여기는 전제와 기준값"],
    },
    goal: { primary: "발표자가 무엇을, 왜 하는지 큰 그림을 이해하기", secondary: "내 생활이나 일과 어떤 관련이 있는지 알기" },
    cognitiveBehavior: { jargonTolerance: "low", abstractionTolerance: "medium-low", inferenceTendency: "medium (앞의 설명을 단서로 뜻을 추론하려 함)", questionTendency: "medium", patience: "medium" },
    attention: {
      initialAttention: "medium-high",
      attentionTriggers: ["자기 경험과 연결되는 사례", "분명한 문제 제기", "결과가 무엇을 바꾸는지에 대한 설명"],
      attentionDropFactors: ["정의 없이 이어지는 용어", "왜 중요한지 모르는 세부 설명이 길게 이어짐"],
    },
    expectation: { expectedInformation: ["무엇을 해결하려는지", "결과가 무엇인지", "왜 그게 중요한지"], expectedDepth: "개념 수준" },
    decisionRules: {
      importantIssues: ["이후 설명이 의존하는 핵심 개념의 의미를 놓침", "앞뒤 내용의 연결이 끊김", "왜 이 이야기를 하는지 모름"],
      ignoreConditions: ["세부 수치의 정밀함", "전문가 수준의 기술적 정확성", "말투·단어 선택 취향"],
    },
  },
  peer: {
    identity: { role: "주제에 관심이 있고 인접 분야에서 일하는 사람", ageGroup: "20~40대", background: "업무에서 비슷한 도구나 개념을 간접적으로 접해 봄" },
    knowledge: {
      domainKnowledge: "분야의 대표 개념은 들어 봤지만 세부 원리는 잘 모름",
      knownConcepts: ["분야에서 널리 알려진 대표 용어", "일반적인 업무 프로세스와 성과 지표", "발표 구조의 일반적인 관례"],
      unknownConcepts: ["세부 구현 방식", "분야 안에서만 쓰는 약어", "비교 대상이 되는 기준 수치"],
    },
    goal: { primary: "핵심 메시지를 한 문장으로 가져가기", secondary: "내 일에 적용할 수 있는지 판단하기" },
    cognitiveBehavior: { jargonTolerance: "medium", abstractionTolerance: "medium", inferenceTendency: "medium-high", questionTendency: "medium", patience: "medium" },
    attention: {
      initialAttention: "medium",
      attentionTriggers: ["실제 적용 사례", "명확한 전후 비교", "다음 내용을 예고하는 구조"],
      attentionDropFactors: ["전체 구조가 보이지 않음", "같은 내용의 반복", "결론이 늦게 나옴"],
    },
    expectation: { expectedInformation: ["핵심 주장", "근거가 되는 결과", "적용 방법"], expectedDepth: "개념과 적용 사이" },
    decisionRules: {
      importantIssues: ["핵심 메시지가 흐려짐", "주장과 근거의 연결이 약함", "적용 방법이 보이지 않음"],
      ignoreConditions: ["사소한 용어의 부정확함", "표현 취향", "청중을 위한 적절한 단순화"],
    },
  },
  specialist: {
    identity: { role: "발표 분야를 직접 다루는 실무자 또는 연구자", ageGroup: "30~40대", background: "분야의 방법론과 한계를 평소에 검토함" },
    knowledge: {
      domainKnowledge: "분야의 전문 용어, 방법론, 흔한 한계를 잘 앎",
      knownConcepts: ["분야의 전문 용어와 약어", "대표적인 방법과 대안", "결과를 해석하는 기준"],
      unknownConcepts: ["이 발표만의 구체적인 데이터·조건", "발표자가 내린 설계 결정의 이유"],
    },
    goal: { primary: "주장이 근거로 뒷받침되는지 확인하기", secondary: "방법의 타당성과 한계를 파악하기" },
    cognitiveBehavior: { jargonTolerance: "high", abstractionTolerance: "high", inferenceTendency: "high (빠진 단계를 스스로 채움)", questionTendency: "high (근거·조건·한계)", patience: "medium-low (이미 아는 기초 설명이 길면 관심이 떨어질 수 있음)" },
    attention: {
      initialAttention: "medium",
      attentionTriggers: ["새로운 방법이나 예상 밖의 결과", "구체적인 수치와 조건", "한계에 대한 솔직한 설명"],
      attentionDropFactors: ["근거 없이 반복되는 주장", "이미 아는 기초 설명이 길게 이어짐"],
    },
    expectation: { expectedInformation: ["방법과 조건", "비교 기준", "한계와 예외"], expectedDepth: "방법 수준" },
    decisionRules: {
      importantIssues: ["근거 없는 핵심 주장", "결과 해석에 필요한 조건 누락", "논리의 비약"],
      ignoreConditions: ["청중을 위한 단순화나 비유의 기술적 부정확성(핵심을 왜곡하지 않는 한)", "말투·표현", "발표 범위를 벗어난 세부 사항"],
    },
  },
};

export const REACTION_TYPES = [
  "NO_SIGNIFICANT_CHANGE",
  "UNDERSTANDING_GAIN",
  "UNDERSTANDING_DROP",
  "CONFUSION",
  "CURIOSITY",
  "INTEREST_INCREASE",
  "INTEREST_DROP",
  "QUESTION",
  "SURPRISE",
  "CONNECTION_FORMED",
  "CONNECTION_LOST",
] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const CONFUSION_TYPES = [
  "TERM_CONFUSION",
  "CONCEPT_CONFUSION",
  "CONNECTION_CONFUSION",
  "PURPOSE_CONFUSION",
  "EXAMPLE_GAP",
  "CONTEXT_GAP",
  "LOGIC_GAP",
  "REFERENCE_GAP",
] as const;
export type ConfusionType = (typeof CONFUSION_TYPES)[number];

export const LIKELIHOODS = ["high", "likely", "possible", "unlikely", "uncertain"] as const;
export type Likelihood = (typeof LIKELIHOODS)[number];

export const SALIENCE_LEVELS = ["IGNORE", "LOW", "SIGNIFICANT", "CRITICAL"] as const;
export type SalienceLevel = (typeof SALIENCE_LEVELS)[number];

export const CONFUSION_LABEL: Record<ConfusionType, string> = {
  TERM_CONFUSION: "용어를 모름",
  CONCEPT_CONFUSION: "개념 이해 어려움",
  CONNECTION_CONFUSION: "개념 사이 관계가 안 보임",
  PURPOSE_CONFUSION: "왜 필요한지 모름",
  EXAMPLE_GAP: "구체적인 사례 부족",
  CONTEXT_GAP: "배경 설명 부족",
  LOGIC_GAP: "논리 연결 부족",
  REFERENCE_GAP: "설명 안 된 대상 참조",
};

export const LIKELIHOOD_LABEL: Record<Likelihood, string> = {
  high: "높은 확률",
  likely: "가능성이 높음",
  possible: "가능성이 있음",
  unlikely: "가능성이 낮음",
  uncertain: "판단하기 어려움",
};

const NEGATIVE_REACTIONS = new Set<ReactionType>(["UNDERSTANDING_DROP", "CONFUSION", "INTEREST_DROP", "CONNECTION_LOST", "QUESTION"]);
const UNDERSTANDING_LOSS = new Set<ReactionType>(["UNDERSTANDING_DROP", "CONFUSION", "CONNECTION_LOST"]);
const INTEREST_GAIN = new Set<ReactionType>(["INTEREST_INCREASE", "CURIOSITY", "SURPRISE"]);

// ---------------------------------------------------------------------------
// Model output
// ---------------------------------------------------------------------------

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().nullable(),
);
const optionalObject = <T extends z.ZodRawShape>(shape: T) =>
  z.preprocess((value) => (value && typeof value === "object" && !Array.isArray(value) ? value : null), z.object(shape).nullable());

export const simulatedSectionSchema = z.object({
  sectionId: z.string().min(1),
  stateBefore: z.string().min(1),
  newInformation: z.string().min(1),
  stateAfter: z.string().min(1),
  reaction: z.enum(REACTION_TYPES).catch("NO_SIGNIFICANT_CHANGE"),
  understanding: z.enum(["followed", "partly_lost", "lost"]),
  agreement: z.enum(["agree", "neutral", "disagree", "unclear"]).catch("unclear"),
  cause: z.preprocess((value) => (CONFUSION_TYPES as readonly unknown[]).includes(value) ? value : null, z.enum(CONFUSION_TYPES).nullable()),
  evidence: z.string().min(1),
  naturalReaction: z.string().min(1),
  likelihood: z.enum(LIKELIHOODS).catch("uncertain"),
  salience: z
    .object({
      understanding: z.boolean().catch(false),
      attention: z.boolean().catch(false),
      keyMessage: z.boolean().catch(false),
      natural: z.boolean().catch(false),
      improvable: z.boolean().catch(false),
    })
    .catch({ understanding: false, attention: false, keyMessage: false, natural: false, improvable: false }),
  question: optionalText,
  mentalModelGap: optionalObject({ missingModel: z.string().min(1), approach: z.string().min(1) }),
  recovery: optionalText,
  improvement: optionalObject({ title: z.string().min(1), action: z.string().min(1), example: z.string().min(1) }),
});
export type SimulatedSection = z.infer<typeof simulatedSectionSchema>;

export const simulationResponseSchema = z.object({
  overallExperience: z.string().min(1),
  sections: z.array(simulatedSectionSchema).min(1).max(12),
});
export type SimulationResponse = z.infer<typeof simulationResponseSchema>;

export function simulationKoreanStrings(response: SimulationResponse): string[] {
  return [
    response.overallExperience,
    ...response.sections.flatMap((section) => [
      section.stateBefore,
      section.newInformation,
      section.stateAfter,
      section.naturalReaction,
      ...(section.question ? [section.question] : []),
      ...(section.recovery ? [section.recovery] : []),
      ...(section.mentalModelGap ? [section.mentalModelGap.missingModel, section.mentalModelGap.approach] : []),
      ...(section.improvement ? [section.improvement.title, section.improvement.action, section.improvement.example] : []),
    ]),
  ];
}

// ---------------------------------------------------------------------------
// Prompt layers: system rules → persona → presentation context
// ---------------------------------------------------------------------------

const SIMULATION_RULES = `[관중 시뮬레이션 규칙]
- 당신의 1차 목적은 발표를 평가하는 것이 아니라, 아래 인지 모델을 가진 관중이 발표를 들을 때 머릿속에서 일어나는 변화를 시뮬레이션하는 것입니다.
- 판단은 페르소나 설명에서 곧바로 나오면 안 됩니다. 이 관중의 지식·목표와 발표 내용이 실제로 상호작용한 결과로만 반응을 만드세요.
- 다음 추론은 금지입니다: "배경지식이 적으니 어려울 것이다", "비판적인 관중이니 문제를 찾는다", "전문 용어가 나왔으니 헷갈린다", "비유가 없으니 나쁜 설명이다", "질문이 없으니 관심이 없다", "의견이 다르니 발표가 실패했다", "불완전한 점이 있으니 지적한다".
- 전문 용어라도 앞에서 설명되었거나, 문맥으로 추론할 수 있거나, 이 관중이 이미 아는 개념이면 문제로 보지 마세요.`;

const COGNITIVE_STATE_RULES = `[인지 상태 규칙]
- 구간을 발표 순서대로 하나씩 처리하세요. 첫 구간의 stateBefore는 발표를 듣기 전 상태이고, 이후 구간의 stateBefore는 직전 구간의 stateAfter에서 이어져야 합니다.
- 각 구간에서 다음 순서로 생각하세요: 현재 이해 상태 → 새로 들어온 정보 → 필요한 사전 지식 → 추론 가능 여부 → 앞 내용과의 연결 → 이해·관심 변화 → 질문 발생 여부 → 의미 있는 반응인지.
- 상태에는 이해(무엇을 설명한다고 이해하는가), 불확실성, 맥락(왜 이 내용을 말한다고 생각하는가), 연결, 관련성, 집중, 흥미가 포함됩니다.
- 대부분의 구간은 NO_SIGNIFICANT_CHANGE가 자연스럽습니다. 의미 있는 변화가 있을 때만 다른 반응 유형을 고르세요.
- 이해(understanding)와 동의(agreement)는 별개입니다. 이해했지만 반대할 수 있고, 이해하지 못했지만 동의할 수도 있습니다.`;

const SALIENCE_RULES = `[중요도 규칙]
- 반응마다 salience 다섯 항목을 true/false로 표시하세요: understanding(이해에 실제 영향), attention(집중에 실제 영향), keyMessage(핵심 메시지 이해에 영향), natural(실제 관중이 자연스럽게 느낄 반응), improvable(고치면 관중 경험이 의미 있게 좋아짐). 변화가 없으면 모두 false입니다.
- 단어 선택 취향, 사소한 문법 오류, 말버릇, 문장 표현 차이, 개인적인 표현 선호, 사소한 말투, 전문가만 알아챌 미세한 기술 문제는 이해나 집중에 실제 영향이 없는 한 무시하세요.
- 혼란이 생겼다면 cause를 TERM_CONFUSION(용어 자체를 모름), CONCEPT_CONFUSION(용어는 알지만 개념이 어려움), CONNECTION_CONFUSION(개념 간 관계를 모름), PURPOSE_CONFUSION(왜 필요한지 모름), EXAMPLE_GAP(추상 설명은 알지만 사례가 없어 이해가 완성되지 않음), CONTEXT_GAP(필요한 배경이 없음), LOGIC_GAP(논리 연결 부족), REFERENCE_GAP(앞에서 설명하지 않은 대상을 참조) 중 하나로 분류하세요. 혼란이 없으면 null입니다.
- mentalModelGap은 네 조건을 모두 만족할 때만 쓰세요: 개념이 추상적이다, 이 관중에게 적절한 mental model이 없다, 현재 설명만으로 이해하기 어렵다, 익숙한 개념과 연결하면 격차가 크게 줄어든다. missingModel에는 부족한 mental model을, approach에는 어떤 익숙한 구조와 연결할지를 쓰세요. "비유를 사용하세요" 같은 일반론은 금지입니다.
- question은 설명되지 않은 인과관계, 해결되지 않은 모순, 중요한 개념의 불명확성, 실제 적용에 대한 궁금증, 다음 설명을 이해하는 데 필요한 정보가 있을 때만, 지금까지의 상태에서 자연스럽게 생길 때만 쓰세요. 똑똑해 보이기 위한 질문은 금지입니다.
- likelihood는 high(높은 확률), likely(가능성이 높음), possible(가능성이 있음), unlikely(가능성이 낮음), uncertain(판단하기 어려움) 중 하나입니다. transcript가 짧거나 이 관중의 사전 지식과 관련된 정보가 부족하면 낮추세요.`;

const OUTPUT_RULES = `[출력 규칙]
- evidence는 해당 구간 transcript에서 그대로 인용한 문장이나 구절이어야 합니다.
- naturalReaction은 이 관중의 머릿속 변화를 "~할 가능성이 있어요"처럼 불확실성을 담아 한두 문장으로 쓰세요. 시뮬레이션을 사실처럼 단정하지 마세요.
- improvement는 salience가 높고 발표자가 실제로 고칠 수 있을 때만 쓰고, 아니면 null입니다. recovery는 이후 설명으로 이해가 회복될 수 있는 방법이 있을 때만 씁니다.
- understanding은 followed, partly_lost, lost 중 하나입니다. 점수는 만들지 마세요.
- 모든 문자열 값은 자연스러운 한국어로 작성하세요. 반응 유형·원인·확신 수준 같은 열거값만 아래 영문 값을 그대로 쓰세요. JSON 외의 설명이나 마크다운을 반환하지 마세요.
아래 JSON 형식만 반환하세요:
{"overallExperience":"발표 전체를 들으며 머릿속에서 일어난 흐름 한두 문장","sections":[{"sectionId":"intro","stateBefore":"듣기 전 상태","newInformation":"이 구간에서 새로 들어온 정보","stateAfter":"들은 뒤 상태","reaction":"NO_SIGNIFICANT_CHANGE","understanding":"followed","agreement":"neutral","cause":null,"evidence":"transcript 인용","naturalReaction":"자연스러운 반응","likelihood":"likely","salience":{"understanding":false,"attention":false,"keyMessage":false,"natural":false,"improvable":false},"question":null,"mentalModelGap":null,"recovery":null,"improvement":null}]}
reaction은 ${REACTION_TYPES.join(", ")} 중 하나입니다.`;

export const SIMULATION_SYSTEM_RULES = [SIMULATION_RULES, COGNITIVE_STATE_RULES, SALIENCE_RULES, OUTPUT_RULES].join("\n\n");

export function personaPrompt(name: string, model: PersonaCognitiveModel): string {
  const list = (items: string[]) => items.join(", ");
  return `[관중 인지 모델: ${name}]
- 정체성: ${model.identity.role} (${model.identity.ageGroup}). ${model.identity.background}
- 지식: ${model.knowledge.domainKnowledge}. 아는 개념: ${list(model.knowledge.knownConcepts)}. 모르는 개념: ${list(model.knowledge.unknownConcepts)}
- 목표: ${model.goal.primary} / ${model.goal.secondary}
- 인지 성향: 전문 용어 허용도 ${model.cognitiveBehavior.jargonTolerance}, 추상화 허용도 ${model.cognitiveBehavior.abstractionTolerance}, 추론 경향 ${model.cognitiveBehavior.inferenceTendency}, 질문 경향 ${model.cognitiveBehavior.questionTendency}, 인내심 ${model.cognitiveBehavior.patience}
- 집중: 처음 집중도 ${model.attention.initialAttention}. 집중이 올라가는 계기: ${list(model.attention.attentionTriggers)}. 집중이 떨어지는 요인: ${list(model.attention.attentionDropFactors)}
- 기대: ${list(model.expectation.expectedInformation)} (기대하는 깊이: ${model.expectation.expectedDepth})
- 중요하게 여기는 문제: ${list(model.decisionRules.importantIssues)}
- 무시하는 것: ${list(model.decisionRules.ignoreConditions)}`;
}

export function presentationContext(sections: { sectionId: string; title: string; startSeconds: number; transcript: string }[]): string {
  return `[발표 맥락]
아래 구간을 발표 순서대로 들으며 시뮬레이션하세요. 구간 밖의 정보를 추측하지 마세요.
${sections.map((section, index) => `(${index + 1}) sectionId=${section.sectionId} · ${formatTimestamp(section.startSeconds)} · ${section.title}\n${section.transcript}`).join("\n\n")}`;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Salience, priority and synthesis inputs (deterministic)
// ---------------------------------------------------------------------------

export function salienceLevel(section: Pick<SimulatedSection, "salience" | "reaction">): SalienceLevel {
  if (section.reaction === "NO_SIGNIFICANT_CHANGE") return "IGNORE";
  const met = Object.values(section.salience).filter(Boolean).length;
  if (met >= 5) return "CRITICAL";
  if (met === 4) return "SIGNIFICANT";
  if (met >= 2) return "LOW";
  return "IGNORE";
}

/** A reaction the presenter may need to act on: negative, salient and grounded. */
export function isIssue(section: Pick<SimulatedSection, "salience" | "reaction" | "understanding" | "cause">): boolean {
  if (salienceLevel(section) === "IGNORE") return false;
  return NEGATIVE_REACTIONS.has(section.reaction) || section.understanding !== "followed" || section.cause !== null;
}

/** Short or thin transcripts can't support confident simulation: step likelihood down once. */
export function calibrateLikelihood(likelihood: Likelihood, thinEvidence: boolean): Likelihood {
  if (!thinEvidence) return likelihood;
  return ({ high: "likely", likely: "possible", possible: "possible", unlikely: "unlikely", uncertain: "uncertain" } as const)[likelihood];
}

const LEVEL_WEIGHT: Record<SalienceLevel, number> = { IGNORE: 0, LOW: 1, SIGNIFICANT: 3, CRITICAL: 4 };
const UNDERSTANDING_WEIGHT = { lost: 1, partly_lost: 0.7, followed: 0.45 } as const;
const LIKELIHOOD_WEIGHT: Record<Likelihood, number> = { high: 1, likely: 0.85, possible: 0.6, unlikely: 0.3, uncertain: 0.4 };

export type PersonaSimulation = { personaId: PersonaId; section: SimulatedSection };

export type AudienceIssue = {
  section: StructureSection;
  level: SalienceLevel;
  priority: number;
  /** Listeners for whom this was a salient issue, most affected first. */
  affected: PersonaSimulation[];
  /** Every listener's state for the same section, for cross-persona comparison. */
  all: PersonaSimulation[];
  cause: ConfusionType | null;
  likelihood: Likelihood;
};

/**
 * Understanding impact × duration × core-message importance × audience likelihood,
 * with a mild boost when more than one listener hit the same spot.
 */
export function issuePriority(items: PersonaSimulation[], section: StructureSection, talkSeconds: number): number {
  const durationShare = talkSeconds > 0 ? Math.min(1, (section.endSeconds - section.startSeconds) / talkSeconds) : 0.25;
  const duration = 0.6 + 0.4 * durationShare;
  const best = Math.max(
    ...items.map(({ section: s }) => {
      const impact = LEVEL_WEIGHT[salienceLevel(s)] * UNDERSTANDING_WEIGHT[s.understanding];
      const core = s.salience.keyMessage ? 1.5 : 1;
      return impact * core * LIKELIHOOD_WEIGHT[s.likelihood];
    }),
  );
  const breadth = 1 + 0.25 * (items.length - 1);
  return Math.round(best * duration * breadth * 1000) / 1000;
}

const MAX_ISSUES = 5;
const MIN_ISSUES = 3;

/**
 * Salience filter + priority: significant/critical issues first (at most five);
 * low-priority issues only fill up to three so a quiet talk isn't padded with noise.
 */
export function selectIssues(structure: StructureSection[], simulations: PersonaSimulation[], talkSeconds: number): AudienceIssue[] {
  const candidates = structure.flatMap((section) => {
    const all = simulations.filter((item) => item.section.sectionId === section.id);
    const affected = all
      .filter((item) => isIssue(item.section))
      .sort((a, b) => LEVEL_WEIGHT[salienceLevel(b.section)] - LEVEL_WEIGHT[salienceLevel(a.section)]);
    if (affected.length === 0) return [];
    const level = affected.map((item) => salienceLevel(item.section)).reduce((a, b) => (LEVEL_WEIGHT[b] > LEVEL_WEIGHT[a] ? b : a));
    const lead = affected[0]!.section;
    return [{
      section,
      level,
      priority: issuePriority(affected, section, talkSeconds),
      affected,
      all,
      cause: affected.find((item) => item.section.cause)?.section.cause ?? null,
      likelihood: lead.likelihood,
    } satisfies AudienceIssue];
  });
  const ranked = candidates.sort((a, b) => b.priority - a.priority);
  const major = ranked.filter((issue) => issue.level === "SIGNIFICANT" || issue.level === "CRITICAL").slice(0, MAX_ISSUES);
  const fill = ranked.filter((issue) => issue.level === "LOW").slice(0, Math.max(0, MIN_ISSUES - major.length));
  return [...major, ...fill];
}

export type KeyMoment = {
  kind: "first_drop" | "interest_peak" | "common_question";
  sectionId: string;
  startSeconds: number;
  title: string;
  detail: string;
  personaIds: PersonaId[];
};

export function keyMoments(structure: StructureSection[], simulations: PersonaSimulation[], names: Record<PersonaId, string>): KeyMoment[] {
  const itemsFor = (sectionId: string) => simulations.filter((item) => item.section.sectionId === sectionId);
  const who = (items: PersonaSimulation[]) => items.map((item) => names[item.personaId]).join(", ");
  const moments: KeyMoment[] = [];

  for (const section of structure) {
    const drops = itemsFor(section.id).filter((item) => UNDERSTANDING_LOSS.has(item.section.reaction) && salienceLevel(item.section) !== "IGNORE");
    if (drops.length > 0) {
      moments.push({
        kind: "first_drop",
        sectionId: section.id,
        startSeconds: section.startSeconds,
        title: "이해가 처음으로 떨어진 구간",
        detail: `${who(drops)}의 이해가 ${section.title}에서 처음 흔들렸을 ${drops.length > 1 ? "가능성이 높아요" : "가능성이 있어요"}.`,
        personaIds: drops.map((item) => item.personaId),
      });
      break;
    }
  }

  const peak = structure
    .map((section) => ({ section, items: itemsFor(section.id).filter((item) => INTEREST_GAIN.has(item.section.reaction) && item.section.salience.natural) }))
    .filter(({ items }) => items.length > 0)
    .sort((a, b) => b.items.length - a.items.length)[0];
  if (peak) {
    moments.push({
      kind: "interest_peak",
      sectionId: peak.section.id,
      startSeconds: peak.section.startSeconds,
      title: "관심이 가장 크게 올라간 구간",
      detail: `${who(peak.items)}이 ${peak.section.title}에서 다음 내용을 더 듣고 싶어 했을 가능성이 있어요.`,
      personaIds: peak.items.map((item) => item.personaId),
    });
  }

  const asked = structure
    .map((section) => ({ section, items: itemsFor(section.id).filter((item) => item.section.question && item.section.salience.natural) }))
    .filter(({ items }) => items.length >= 2)
    .sort((a, b) => b.items.length - a.items.length)[0];
  if (asked) {
    moments.push({
      kind: "common_question",
      sectionId: asked.section.id,
      startSeconds: asked.section.startSeconds,
      title: "여러 관중이 공통으로 질문을 가진 구간",
      detail: `${who(asked.items)}이 ${asked.section.title}에서 비슷한 궁금증을 가졌을 가능성이 있어요.`,
      personaIds: asked.items.map((item) => item.personaId),
    });
  }

  return moments.sort((a, b) => a.startSeconds - b.startSeconds);
}

export type NaturalQuestion = { question: string; sectionId: string; personaIds: PersonaId[] };

/** Only questions a real listener would plausibly ask at that point, in speaking order. */
export function naturalQuestions(structure: StructureSection[], simulations: PersonaSimulation[], limit = 5): NaturalQuestion[] {
  const order = new Map(structure.map((section, index) => [section.id, index]));
  const byText = new Map<string, NaturalQuestion>();
  for (const { personaId, section } of simulations) {
    if (!section.question || !section.salience.natural || section.likelihood === "unlikely") continue;
    const key = section.question.replace(/\s+/g, " ").trim();
    const existing = byText.get(key);
    if (existing) {
      if (!existing.personaIds.includes(personaId)) existing.personaIds.push(personaId);
    } else {
      byText.set(key, { question: key, sectionId: section.sectionId, personaIds: [personaId] });
    }
  }
  return [...byText.values()]
    .sort((a, b) => b.personaIds.length - a.personaIds.length || (order.get(a.sectionId) ?? 0) - (order.get(b.sectionId) ?? 0))
    .slice(0, limit)
    .sort((a, b) => (order.get(a.sectionId) ?? 0) - (order.get(b.sectionId) ?? 0));
}

/**
 * Fallback cross-persona explanation when the synthesis model gives none:
 * describe the pattern (who stopped, who didn't, and on what) instead of a head count.
 */
export function patternFallback(issue: AudienceIssue, names: Record<PersonaId, string>): string {
  const affectedIds = new Set(issue.affected.map((item) => item.personaId));
  const others = issue.all.filter((item) => !affectedIds.has(item.personaId));
  const cause = issue.cause ? CONFUSION_LABEL[issue.cause] : "이해 연결이 약해짐";
  const affectedNames = issue.affected.map((item) => names[item.personaId]).join(", ");
  if (others.length === 0) {
    return `모든 관중이 같은 지점에서 멈췄을 가능성이 높아요. 배경지식과 관계없이 "${cause}" 문제가 생긴 것으로 보여요.`;
  }
  const otherNames = others.map((item) => names[item.personaId]).join(", ");
  return `${affectedNames}은 "${cause}" 때문에 멈췄을 가능성이 있지만, ${otherNames}은 기존 지식으로 이 연결을 보완했을 가능성이 있어요.`;
}

/** Internal-only numbers kept for the legacy result schema; never shown as a grade. */
export function internalScores(section: Pick<SimulatedSection, "understanding" | "reaction">): { comprehensionScore: number; attentionScore: number } {
  const comprehensionScore = { followed: 85, partly_lost: 62, lost: 35 }[section.understanding];
  const attentionScore = section.reaction === "INTEREST_DROP" ? 45 : INTEREST_GAIN.has(section.reaction) ? 88 : 75;
  return { comprehensionScore, attentionScore };
}
