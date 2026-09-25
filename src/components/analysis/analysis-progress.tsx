"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAnalysisStatus, useRetryAnalysis } from "@/features/presentation/queries";
import {
  activePersonaId,
  analysisTimeline,
  hasStepDetail,
  runningItem,
  seatStatesFor,
  type TimelineItem,
} from "@/features/analysis/pipeline";
import { AudienceSeats } from "@/components/audience/audience-seats";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { PersonaChip } from "@/components/ui/persona-chip";
import { Spinner } from "@/components/ui/spinner";
import { isNotFoundError, safeErrorMessage, type AnalysisStage, type AnalysisStatus } from "@/shared/api";
import { cn } from "@/lib/utils";
import { StructureProgress, InsightCards } from "./structure-progress";

/** What the seats are doing, in the audience's words. Mirrors the reported stage only. */
const AUDIENCE_CAPTION: Record<AnalysisStage, string> = {
  queued: "녹음은 도착했어요. 관중이 듣기 전에 발표를 준비하고 있어요.",
  transcribing: "관중은 발표를 기다리고 있어요. 음성을 먼저 문장으로 정리하고 있어요.",
  structuring: "발표의 도입·핵심 내용·마무리 구조를 읽고 있어요.",
  segmenting: "분석할 핵심 구간을 나누고 있어요.",
  listening: "세 관중이 각자의 시선으로 발표를 듣고 있어요.",
  cross_check: "관중들의 반응이 같은지, 달랐는지 비교하고 있어요.",
  synthesizing: "관중이 다 들었어요. 어디서 왜 막혔는지 정리하고 있어요.",
  completed: "관중이 다 들었어요. 결과를 정리했어요.",
  failed: "분석이 중간에 멈췄어요.",
};

function captionFor(status: AnalysisStatus | undefined): string {
  if (!status) return "분석 상태를 확인하고 있어요.";
  // With step detail, "listening" covers structure and section reading too; only claim listening when a persona is.
  if (status.stage === "listening" && hasStepDetail(status.pipeline)) {
    const active = activePersonaId(status);
    const name = status.pipeline.personas?.find((p) => p.id === active)?.name;
    return name ? `지금은 ${name} 차례예요. 관중은 한 명씩 발표를 들어요.` : "관중이 듣기 전에 발표의 흐름을 먼저 살펴보고 있어요.";
  }
  return AUDIENCE_CAPTION[status.stage];
}

export function AnalysisProgress({ id }: { id: string }) {
  const router = useRouter();
  const status = useAnalysisStatus(id);
  const retry = useRetryAnalysis(id);

  const stage = status.data?.stage;
  const failed = stage === "failed";
  const completed = stage === "completed";
  const pipeline = status.data?.pipeline;
  const detailed = hasStepDetail(pipeline);
  const timeline = analysisTimeline(status.data);
  const running = runningItem(timeline);

  useEffect(() => {
    if (completed) router.replace(`/result/${encodeURIComponent(id)}`);
  }, [completed, id, router]);

  if (status.isError) {
    const notFound = isNotFoundError(status.error);
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

  return (
    <Shell>
      <section aria-labelledby="audience-title" className="space-y-3">
        <h2 id="audience-title" className="sr-only">
          가상 관중
        </h2>
        <AudienceSeats state={seatStatesFor(status.data)} />
        <p className="text-body-md text-on-surface-variant">{captionFor(status.data)}</p>
      </section>

      <section className="border-y border-outline-variant/60 py-6 sm:py-8">
        <p role="status" aria-live="polite" className="sr-only">
          {status.isPending
            ? "분석 상태를 확인하고 있어요."
            : completed
              ? "분석이 끝났어요. 결과 화면으로 이동해요."
              : failed
                ? "분석에 실패했어요."
                : running
                  ? `${running.label} 단계예요.`
                  : "분석 상태를 확인하고 있어요."}
        </p>

        <h2 className="sr-only">분석 단계</h2>
        <ol className="space-y-1">
          {timeline.map((item, i) => (
            <TimelineRow
              key={item.key}
              item={item}
              index={i}
              // The backend's own explanation replaces the generic copy for the running step.
              detail={item === running && detailed && pipeline.message ? pipeline.message : item.detail}
            />
          ))}
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
            {status.data?.error ? safeErrorMessage(status.data.error.code) : "일시적인 문제일 수 있어요."} 녹음은 서버에 남아 있어서 다시 올릴 필요 없어요.
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
      </section>

      {detailed && status.data && <NowListening status={status.data} />}
      {detailed && <StructureProgress status={status.data!} />}
      {detailed && <InsightCards pipeline={pipeline} />}

      {!failed && !completed && (
        <p className="text-body-sm text-on-surface-variant">
          보통 1–2분 정도 걸려요. 이 페이지를 열어 두면 끝나는 대로 결과 화면으로 넘어가요.
        </p>
      )}
    </Shell>
  );
}

const STATE_SR: Record<TimelineItem["state"], string> = {
  done: " (완료)",
  running: " (진행 중)",
  failed: " (실패)",
  pending: " (대기)",
  skipped: " (건너뜀)",
};

function TimelineRow({ item, index, detail }: { item: TimelineItem; index: number; detail: string }) {
  const { state } = item;
  const active = state === "running";
  return (
    <li aria-current={active ? "step" : undefined} className={cn("flex gap-4 rounded-lg p-3", active && "bg-surface-container-low")}>
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-label-md",
          state === "done" && "bg-secondary text-on-secondary",
          active && "bg-primary-container text-on-primary",
          state === "failed" && "bg-error text-on-error",
          (state === "pending" || state === "skipped") && "bg-surface-container text-on-surface-variant",
        )}
      >
        {state === "done" ? <Check className="size-4" /> : active ? <Spinner /> : state === "failed" ? "!" : state === "skipped" ? "–" : index + 1}
      </span>
      <div className="min-w-0 pt-1">
        <p className={cn("text-label-lg", state === "pending" || state === "skipped" ? "text-on-surface-variant" : "text-on-surface")}>
          {item.label}
          <span className="sr-only">{STATE_SR[state]}</span>
        </p>
        {active && (
          <p key={detail} className="mt-1 animate-rise-in text-body-md text-on-surface-variant motion-reduce:animate-none">
            {detail}
          </p>
        )}
        {state === "failed" && <p className="mt-1 text-body-md text-on-surface-variant">이 단계에서 멈췄어요.</p>}
      </div>
    </li>
  );
}

/** Current section and persona, shown only while the backend names them. */
function NowListening({ status }: { status: AnalysisStatus }) {
  const pipeline = status.pipeline!;
  if (status.stage === "failed" || status.stage === "completed") return null;
  const section = pipeline.sections?.find((s) => s.id === pipeline.currentSectionId);
  const personaId = activePersonaId(status);
  const persona = pipeline.personas?.find((p) => p.id === personaId);
  if (!section && !persona) return null;

  return (
    <section aria-labelledby="now-title" className="space-y-3 border-l-2 border-primary pl-5">
      <h2 id="now-title" className="text-label-md text-on-surface-variant">
        지금 보고 있는 곳
      </h2>
      <div key={`${section?.id}:${persona?.id}`} className="animate-rise-in space-y-2 motion-reduce:animate-none">
        <p className="flex flex-wrap items-center gap-2">
          {persona && <PersonaChip persona={persona} />}
          {section && <span className="text-headline-sm text-on-surface">{section.title}</span>}
        </p>
        {section?.summary && <p className="text-body-md text-on-surface-variant">{section.summary}</p>}
      </div>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 md:py-16 lg:px-10">
      <div className="max-w-3xl space-y-3">
        <p className="text-label-md text-primary">AI 관중 시뮬레이션</p>
        <h1 className="text-[2.75rem] font-semibold leading-[1.06] tracking-[-0.04em] text-on-surface sm:text-[4rem]">발표를 읽고 있어요.</h1>
        <p className="max-w-2xl text-body-lg text-on-surface-variant">비전공·일반·전문가 관중이 같은 발표를 각자의 시선으로 듣고, 막히는 곳을 찾는 중입니다.</p>
      </div>
      {children}
    </div>
  );
}
