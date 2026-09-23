"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAnalysisStatus, useRetryAnalysis } from "@/features/presentation/queries";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/spinner";
import { isApiError, type AnalysisStage } from "@/shared/api";
import { cn } from "@/lib/utils";

const PIPELINE: { stage: AnalysisStage; label: string; detail: string }[] = [
  { stage: "queued", label: "녹음 받기", detail: "업로드한 녹음을 확인하고 있어요." },
  { stage: "transcribing", label: "말한 내용 옮겨 적기", detail: "발표 음성을 문장 단위로 옮겨 적고 있어요." },
  { stage: "listening", label: "관중이 듣는 중", detail: "각 관중이 자기 관점에서 발표를 따라가고 있어요." },
  { stage: "synthesizing", label: "막힌 지점 정리", detail: "어디서, 왜 막혔는지와 고칠 방법을 정리하고 있어요." },
];

function stageIndex(stage: AnalysisStage | undefined) {
  if (!stage) return 0;
  if (stage === "completed") return PIPELINE.length;
  return Math.max(0, PIPELINE.findIndex((s) => s.stage === stage));
}

export function AnalysisProgress({ id }: { id: string }) {
  const router = useRouter();
  const status = useAnalysisStatus(id);
  const retry = useRetryAnalysis(id);

  const stage = status.data?.stage;
  const current = stageIndex(stage);
  const failed = stage === "failed";
  const completed = stage === "completed";

  useEffect(() => {
    if (completed) router.replace(`/result/${encodeURIComponent(id)}`);
  }, [completed, id, router]);

  if (status.isError) {
    const notFound = isApiError(status.error) && status.error.code === "not_found";
    return (
      <Shell>
        <Notice
          tone="error"
          title={notFound ? "이 발표를 찾을 수 없어요" : "분석 상태를 불러오지 못했어요"}
          actions={
            <>
              {!notFound && (
                <Button size="sm" onClick={() => status.refetch()}>
                  다시 불러오기
                </Button>
              )}
              <Link href="/record" className={buttonVariants({ size: "sm", variant: notFound ? "primary" : "secondary" })}>
                새로 녹음하기
              </Link>
            </>
          }
        >
          {notFound
            ? "주소가 잘못되었거나 분석 기록이 만료되었을 수 있어요. 발표를 다시 녹음해 주세요."
            : "네트워크 연결을 확인한 뒤 다시 불러와 주세요. 분석은 서버에서 계속 진행되고 있어요."}
        </Notice>
      </Shell>
    );
  }

  // Mark the step that was running when the pipeline failed, if the server says.
  const failedAt = failed ? PIPELINE.findIndex((s) => s.stage === status.data?.failedStage) : -1;

  return (
    <Shell>
      <Card className="p-5 sm:p-8">
        <p role="status" aria-live="polite" className="sr-only">
          {status.isPending
            ? "분석 상태를 확인하고 있어요."
            : completed
              ? "분석이 끝났어요. 결과 화면으로 이동해요."
              : failed
                ? "분석에 실패했어요."
                : `${PIPELINE[current]?.label} 단계예요.`}
        </p>

        <ol className="space-y-1">
          {PIPELINE.map((step, i) => {
            const done = completed || (!failed && i < current) || (failed && i < failedAt);
            const active = !completed && !failed && i === current;
            const broken = failed && i === failedAt;
            return (
              <li
                key={step.stage}
                aria-current={active ? "step" : undefined}
                className={cn("flex gap-4 rounded-lg p-3", active && "bg-surface-container-low")}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-label-md",
                    done && "bg-secondary text-on-secondary",
                    active && "bg-primary-container text-on-primary",
                    broken && "bg-error text-on-error",
                    !done && !active && !broken && "bg-surface-container text-on-surface-variant",
                  )}
                >
                  {done ? <Check className="size-4" /> : active ? <Spinner /> : broken ? "!" : i + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <p className={cn("text-label-lg", done || active || broken ? "text-on-surface" : "text-on-surface-variant")}>
                    {step.label}
                    <span className="sr-only">{done ? " (완료)" : active ? " (진행 중)" : broken ? " (실패)" : " (대기)"}</span>
                  </p>
                  {active && <p className="mt-1 text-body-md text-on-surface-variant">{step.detail}</p>}
                  {broken && <p className="mt-1 text-body-md text-on-surface-variant">이 단계에서 멈췄어요.</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {failed && (
          <Notice
            tone="error"
            className="mt-6"
            title="분석을 마치지 못했어요"
            actions={
              <>
                <Button size="sm" onClick={() => retry.mutate()} disabled={retry.isPending}>
                  {retry.isPending && <Spinner />}
                  다시 분석하기
                </Button>
                <Link href="/record" className={buttonVariants({ size: "sm", variant: "secondary" })}>
                  새로 녹음하기
                </Link>
              </>
            }
          >
            {status.data?.error?.message ?? "일시적인 문제일 수 있어요."} 녹음은 서버에 남아 있어서 다시 올릴 필요 없어요.
            {retry.isError && " 재시도 요청도 실패했어요. 잠시 후 다시 눌러 주세요."}
          </Notice>
        )}

        {completed && (
          <div className="mt-6 flex justify-end">
            <Link href={`/result/${encodeURIComponent(id)}`} className={buttonVariants()}>
              결과 보기
            </Link>
          </div>
        )}
      </Card>
      {!failed && !completed && (
        <p className="text-body-sm text-on-surface-variant">
          보통 1–2분 정도 걸려요. 이 페이지를 열어 두면 끝나는 대로 결과 화면으로 넘어가요.
        </p>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 md:px-8 md:py-14">
      <div className="space-y-2">
        <h1 className="text-headline-xl-mobile md:text-headline-xl text-on-surface">관중이 발표를 듣고 있어요</h1>
        <p className="text-body-lg text-on-surface-variant">서로 다른 관중이 각자의 시선으로 발표를 따라가며 막히는 곳을 찾고 있어요.</p>
      </div>
      {children}
    </div>
  );
}
