"use client";

import { Mic } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useAnalysisResult } from "@/features/presentation/queries";
import { useResultUiStore } from "@/features/result/result-ui-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, isNotFoundError, type AnalysisResult } from "@/shared/api";
import { cn, formatDurationLong } from "@/lib/utils";
import { biggestDiscovery, mapSections } from "@/features/result/story";
import { KeyMoments, NaturalQuestionsSection } from "./audience-moments";
import { DifficultSections } from "./difficult-sections";
import { ImprovementsSection } from "./improvements-section";
import { PersonaFeedbackGrid } from "./persona-feedback-grid";
import { DiscoverySection, PresentationMapSection } from "./story-sections";
import { SuggestionsSection } from "./suggestions-section";
import { AudienceSnapshot, Strengths, SummarySection } from "./summary-section";
import { TranscriptSection } from "./transcript-section";

export function ResultView({ id }: { id: string }) {
  const query = useAnalysisResult(id);
  const resetUi = useResultUiStore((s) => s.reset);

  useEffect(() => resetUi(), [id, resetUi]);

  if (query.isPending) return <ResultSkeleton />;

  if (query.isError) {
    const code = isApiError(query.error) ? query.error.code : "unknown";
    return (
      <Container>
        {code === "result_not_ready" ? (
          <Notice
            title="아직 분석이 끝나지 않았어요"
            actions={
              <Link href={`/analyzing/${encodeURIComponent(id)}`} className={buttonVariants({ size: "sm" })}>
                진행 상황 보기
              </Link>
            }
          >
            관중이 발표를 듣는 중이에요. 분석이 끝나면 이 화면에서 결과를 볼 수 있어요.
          </Notice>
        ) : code === "analysis_failed" ? (
          <Notice
            tone="error"
            title="분석을 마치지 못했어요"
            actions={
              <Link href={`/analyzing/${encodeURIComponent(id)}`} className={buttonVariants({ size: "sm" })}>
                다시 분석하러 가기
              </Link>
            }
          >
            녹음은 서버에 남아 있어요. 분석 화면에서 다시 시도해 주세요.
          </Notice>
        ) : isNotFoundError(query.error) ? (
          <Notice
            tone="error"
            title="결과를 찾을 수 없어요"
            actions={
              <Link href="/record" className={buttonVariants({ size: "sm" })}>
                새로 녹음하기
              </Link>
            }
          >
            주소가 잘못되었거나 결과가 만료되었을 수 있어요. 발표를 다시 녹음해 주세요.
          </Notice>
        ) : (
          <Notice
            tone="error"
            title="결과를 불러오지 못했어요"
            actions={
              <Button size="sm" onClick={() => query.refetch()}>
                다시 불러오기
              </Button>
            }
          >
            네트워크 연결을 확인한 뒤 다시 불러와 주세요.
          </Notice>
        )}
      </Container>
    );
  }

  return <ResultReport result={query.data} />;
}

/**
 * The report itself, rendered from an already-loaded result. `notice` replaces the
 * default sample-data label and `closing` replaces the "record again" footer, so other
 * entry points (the exhibition demo) reuse the same report without fetching.
 */
export function ResultReport({
  result,
  notice,
  closing,
}: {
  result: AnalysisResult;
  notice?: React.ReactNode;
  closing?: React.ReactNode;
}) {
  // Chapters after the opening insight; optional ones drop out without leaving gaps in the numbering.
  const hasFixes = result.difficultSections.length > 0;
  const hasSuggestions = result.missingExplanations.length > 0 || result.exampleSuggestions.length > 0;
  const hasMap = mapSections(result).length > 0;
  const hasDiscovery = biggestDiscovery(result) !== null;
  let chapter = 0;
  const mapNo = hasMap ? ++chapter : 0;
  const voicesNo = ++chapter;
  const sectionsNo = ++chapter;
  const fixesNo = hasFixes ? ++chapter : 0;
  const suggestionsNo = hasSuggestions ? ++chapter : 0;
  const questionsNo = result.naturalQuestions?.length ? ++chapter : 0;

  return (
    <Container>
      <header className="space-y-3 border-b border-outline-variant/60 pb-6">
        <p className="text-label-md text-primary">발표 리뷰 리포트</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="max-w-3xl text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.035em] text-on-surface text-balance sm:text-[3.5rem]">{result.title}</h1>
          <p className="shrink-0 text-body-sm text-on-surface-variant sm:pb-1">
            {formatDurationLong(result.durationSec)} · 관중 {result.personas.length}명
          </p>
        </div>
      </header>

      {notice ??
        (result.isSample && (
          <Notice title="샘플 결과예요">
            실제 녹음 내용을 분석한 것이 아니라, 화면 구성을 보여드리기 위한 예시 데이터예요.
          </Notice>
        ))}

      {/* First screen: what happened, the biggest discovery and how each listener took it, side by side. */}
      <div className="space-y-6">
        <SummarySection result={result} />
        <div className={cn("grid gap-x-14 gap-y-8 lg:gap-x-16 xl:gap-x-20", hasDiscovery && "lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,1fr)]")}>
          {hasDiscovery && <DiscoverySection result={result} />}
          <div className="lg:border-l lg:border-outline-variant/60 lg:pl-8 xl:pl-10">
            <AudienceSnapshot result={result} />
          </div>
        </div>
        <KeyMoments result={result} />
        <Strengths result={result} />
      </div>
      {hasMap && <PresentationMapSection result={result} number={mapNo} />}
      <PersonaFeedbackGrid result={result} number={voicesNo} />
      <DifficultSections result={result} number={sectionsNo} />
      {hasFixes && <ImprovementsSection result={result} number={fixesNo} />}
      {hasSuggestions && <SuggestionsSection result={result} number={suggestionsNo} />}
      {questionsNo > 0 && <NaturalQuestionsSection result={result} number={questionsNo} />}
      <TranscriptSection result={result} />

      {closing ?? (
        <section aria-labelledby="next-title" className="flex flex-col items-start gap-4 rounded-xl bg-surface-container-low p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 id="next-title" className="text-headline-sm text-on-surface">
              고친 뒤 다시 들어보기
            </h2>
            <p className="text-body-md text-on-surface-variant">먼저 고칠 곳 하나만 바꿔서 다시 녹음해 보세요.</p>
          </div>
          <Link href="/record" className={buttonVariants()}>
            <Mic aria-hidden />새 녹음 시작
          </Link>
        </section>
      )}
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 md:py-10 lg:px-10">{children}</div>;
}

function ResultSkeleton() {
  return (
    <Container>
      <div role="status" className="space-y-3">
        <span className="sr-only">결과를 불러오고 있어요</span>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-8 w-full max-w-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-64" />
    </Container>
  );
}
