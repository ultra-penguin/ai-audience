import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { EvidenceMetric } from "./evidence-metric";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

type Source = { authors: string; year: number; title: string; venue: string; href: string };

/** Research finding and our reading of it are always visually separate. */
function ResearchCard({ label, claim, children, source, interpretation, delayMs = 0 }: { label: string; claim: string; children: ReactNode; source: Source; interpretation: string; delayMs?: number }) {
  return (
    <Reveal delayMs={delayMs} className="h-full">
      <article className="flex h-full flex-col gap-4 border-t border-on-surface/80 pt-5">
        <div className="space-y-2">
          <p className="text-label-md text-on-surface-variant">{label}</p>
          <h3 className="text-headline-md text-on-surface text-pretty break-keep">{claim}</h3>
        </div>
        {children}
        <p className="text-label-md text-on-surface-variant [overflow-wrap:anywhere]">
          <span className="mr-1.5 rounded-sm bg-surface-container px-1.5 py-0.5 text-label-sm text-on-surface">연구</span>
          {source.authors} ({source.year}). {source.title}. <i>{source.venue}</i>.{" "}
          <a href={source.href} target="_blank" rel="noopener noreferrer" className="-my-3 inline-flex items-center gap-0.5 rounded py-3 text-primary underline-offset-4 hover:underline">
            원문
            <ExternalLink aria-hidden className="size-3" />
            <span className="sr-only">(새 창)</span>
          </a>
        </p>
        <p className="mt-auto border-l-2 border-primary pl-3 text-body-md text-on-surface break-keep">
          <span className="block text-label-md text-primary">우리의 해석</span>
          {interpretation}
        </p>
      </article>
    </Reveal>
  );
}

/** A simplified drawing of the finding, not measured data — labeled as such. */
function AttentionSketch() {
  // Attention dips come back in shorter and shorter cycles as the lecture goes on.
  const points = [0, 18, 34, 48, 60, 70, 79, 86, 92, 97, 100].map((x, i) => `${x * 3},${i % 2 === 0 ? 12 : 44}`);
  return (
    <figure className="space-y-2">
      <svg role="img" aria-label="강의가 진행될수록 집중과 주의 저하가 더 짧은 주기로 번갈아 나타나는 모습을 단순화한 그림" viewBox="0 0 300 60" className="h-24 w-full text-on-surface">
        <line x1="0" y1="56" x2="300" y2="56" stroke="currentColor" strokeOpacity="0.25" />
        <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="flex justify-between text-label-sm text-on-surface-variant">
        <span>집중 ↕</span>
        <span>개념도 · 실제 측정값 아님</span>
        <span>강의 시간 →</span>
      </figcaption>
    </figure>
  );
}

const DELIVERY_FACTORS = ["명확성", "속도", "목소리", "청중과의 상호작용", "질문 응답", "시선"];

export function ResearchEvidence() {
  return (
    <section aria-labelledby="research-title" className="space-y-8 border-t border-outline-variant/60 py-14 md:space-y-10 md:py-20">
      <SectionIntro id="research-title" eyebrow="연구 근거" title="청중의 반응은 측정할 수 있습니다.">
        이해·전달·집중은 연구에서도 따로 관찰되는 신호예요. 아래 수치는 외부 연구 결과이며, 이 서비스 AI의 성능이 아닙니다.
      </SectionIntro>
      <div className="grid gap-10 md:grid-cols-3 md:gap-6 lg:gap-8">
        <ResearchCard
          label="A · 발표 이해도"
          claim="청중의 이해도는 측정 가능한 신호입니다."
          source={{
            authors: "Curtis, Jones & Campbell",
            year: 2016,
            title: "Speaker Impact on Audience Comprehension for Academic Presentations",
            venue: "ICMI ’16",
            href: "https://dl.acm.org/doi/10.1145/2993148.2993194",
          }}
          interpretation="이해는 발표 구간마다 달라지는 신호예요. 그래서 우리는 발표 전체가 아니라 구간 단위로 관중의 이해를 시뮬레이션합니다."
        >
          <EvidenceMetric value={85.4} context="학술 발표 영상 구간을 ‘이해함 / 이해 못함’ 두 단계로 자동 분류했을 때 연구 모델의 정확도" />
        </ResearchCard>

        <ResearchCard
          label="B · 발표 전달"
          delayMs={90}
          claim="좋은 발표는 내용만의 문제가 아닙니다."
          source={{
            authors: "Estrada, Patel, Talente & Kraemer",
            year: 2005,
            title: "The 10-Minute Oral Presentation: What Should I Focus on?",
            venue: "The American Journal of the Medical Sciences",
            href: "https://pubmed.ncbi.nlm.nih.gov/15958872/",
          }}
          interpretation="관중에게 닿는 것은 말한 내용과 말하는 방식이 합쳐진 결과예요. 그래서 관중이 받아들인 발표를 봅니다."
        >
          <div className="space-y-4">
            <EvidenceMetric value={95.5} context="학회 발표 44개 중, 리뷰어가 발표 방식(전달)에 대해 의견을 남긴 발표의 비율 (42개)" />
            <ul aria-label="연구에서 관찰된 발표 방식 요소" className="flex flex-wrap gap-1.5">
              {DELIVERY_FACTORS.map((factor) => (
                <li key={factor} className="rounded-full px-2.5 py-1 text-label-md text-on-surface ring-1 ring-outline-variant">
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        </ResearchCard>

        <ResearchCard
          label="C · 청중 집중"
          delayMs={180}
          claim="청중의 집중은 발표 내내 동일하지 않습니다."
          source={{
            authors: "Bunce, Flens & Neiles",
            year: 2010,
            title: "How Long Can Students Pay Attention in Class? A Study of Student Attention Decline Using Clickers",
            venue: "Journal of Chemical Education",
            href: "https://pubs.acs.org/doi/10.1021/ed100409p",
          }}
          interpretation="집중은 시간에 따라 오르내려요. 그래서 점수 하나가 아니라 발표 타임라인 위에서 반응이 바뀐 순간을 찾습니다."
        >
          <div className="space-y-3">
            <AttentionSketch />
            <p className="text-body-md text-on-surface-variant">
              학생들은 강의 중 집중과 주의 저하를 반복했고, 1분 이하의 짧은 저하가 가장 흔했으며, 강의가 진행될수록 그 주기가 짧아졌어요.
            </p>
          </div>
        </ResearchCard>
      </div>
    </section>
  );
}
