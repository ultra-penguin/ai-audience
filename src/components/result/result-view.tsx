"use client";

import { Mic } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useAnalysisResult } from "@/features/presentation/queries";
import { useResultUiStore } from "@/features/result/result-ui-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, isNotFoundError } from "@/shared/api";
import { formatDurationLong } from "@/lib/utils";
import { DifficultSections } from "./difficult-sections";
import { ImprovementsSection } from "./improvements-section";
import { PersonaFeedbackGrid } from "./persona-feedback-grid";
import { SuggestionsSection } from "./suggestions-section";
import { SummarySection } from "./summary-section";
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

  const result = query.data;
  // Chapters after the opening insight; optional ones drop out without leaving gaps in the numbering.
  const hasFixes = result.difficultSections.length > 0;
  const hasSuggestions = result.missingExplanations.length > 0 || result.exampleSuggestions.length > 0;
  let chapter = 0;
  const voicesNo = ++chapter;
  const sectionsNo = ++chapter;
  const fixesNo = hasFixes ? ++chapter : 0;
  const suggestionsNo = hasSuggestions ? ++chapter : 0;

  return (
    <Container>
      <header className="space-y-3">
        <p className="text-label-md text-on-surface-variant">발표 리뷰 리포트</p>
        <h1 className="text-headline-md md:text-headline-lg text-on-surface text-balance">{result.title}</h1>
        <p className="text-body-md text-on-surface-variant">
          {formatDurationLong(result.durationSec)} · 관중 {result.personas.length}명이 들었어요
        </p>
      </header>

      {result.isSample && (
        <Notice title="샘플 결과예요">
          실제 녹음 내용을 분석한 것이 아니라, 화면 구성을 보여드리기 위한 예시 데이터예요.
        </Notice>
      )}

      <SummarySection result={result} />
      <PersonaFeedbackGrid result={result} number={voicesNo} />
      <DifficultSections result={result} number={sectionsNo} />
      {hasFixes && <ImprovementsSection result={result} number={fixesNo} />}
      {hasSuggestions && <SuggestionsSection result={result} number={suggestionsNo} />}
      <TranscriptSection result={result} />

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
    </Container>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 md:px-8 md:py-14">{children}</div>;
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
