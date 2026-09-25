"use client";

import { Mic, Pause, Play, RotateCcw, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId } from "react";
import { useSubmitPresentation } from "@/features/presentation/queries";
import { useRecorderStore } from "@/features/recording/recorder-store";
import { MAX_RECORDING_MS, MIN_RECORDING_SEC, useMediaRecorder } from "@/features/recording/use-media-recorder";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/spinner";
import { isApiError } from "@/shared/api";
import { cn, formatDuration, formatDurationLong } from "@/lib/utils";
import { LevelMeter } from "./level-meter";
import { RecorderError } from "./recorder-error";

const STATUS_TEXT = {
  idle: "녹음 준비가 되었어요",
  requesting: "마이크 권한을 기다리고 있어요",
  recording: "녹음 중",
  paused: "일시정지됨",
  stopped: "녹음 완료",
  error: "녹음할 수 없어요",
} as const;

const TIPS = [
  "실제 발표처럼 처음부터 끝까지 말해 보세요.",
  "슬라이드 넘김이나 잠깐의 멈춤은 그대로 두어도 괜찮아요.",
  `최소 ${MIN_RECORDING_SEC}초, 최대 ${MAX_RECORDING_MS / 60000}분까지 녹음할 수 있어요.`,
];

export function RecordingStudio() {
  const router = useRouter();
  const titleId = useId();
  const { status, error, elapsedMs, title, recording, hitLimit, setTitle, reset } = useRecorderStore();
  const { start, pause, resume, stop, level } = useMediaRecorder();
  const submit = useSubmitPresentation();

  const isLive = status === "recording" || status === "paused";
  const tooShort = recording !== null && recording.durationSec < MIN_RECORDING_SEC;
  const remainingMs = MAX_RECORDING_MS - elapsedMs;

  // Warn before leaving with an unsent take.
  useEffect(() => {
    if (!isLive && !(status === "stopped" && !submit.isSuccess)) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isLive, status, submit.isSuccess]);

  const handleAnalyze = () => {
    if (!recording || tooShort) return;
    submit.mutate(
      { audio: recording.blob, mimeType: recording.mimeType, durationSec: recording.durationSec, title: title.trim() || undefined },
      {
        onSuccess: (id) => {
          router.push(`/analyzing/${encodeURIComponent(id)}`);
          reset();
        },
      },
    );
  };

  const handleRerecord = () => {
    submit.reset();
    reset();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="flex flex-col justify-between gap-6 border-b border-outline-variant/60 pb-8 sm:flex-row sm:items-end">
          <div className="space-y-3">
            <p className="text-label-md text-primary">새 발표</p>
            <h1 className="text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.035em] text-on-surface sm:text-[3.5rem]">발표할 준비가 되었나요?</h1>
            <p className="max-w-xl text-body-lg text-on-surface-variant">평소 발표하듯 말해 주세요. 녹음을 마치면 가상 관중이 같은 발표를 들어요.</p>
          </div>
          <p className="max-w-[14rem] text-body-sm text-on-surface-variant sm:text-right">마이크 권한만 허용하면 바로 시작할 수 있어요.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor={titleId} className="text-label-lg text-on-surface">
            발표 제목 <span className="text-on-surface-variant">(선택)</span>
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="예: 동네 카페를 위한 수요 예측 도입 제안"
            disabled={submit.isPending}
            className="h-12 w-full rounded-xl border-b border-outline-variant/80 bg-transparent px-0 text-body-lg text-on-surface focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-none disabled:opacity-60"
          />
        </div>

        <section className="rounded-[2rem] bg-surface-container-low px-5 py-10 sm:px-10 sm:py-16">
          <div className="flex flex-col items-center gap-7 text-center">
            <p role="status" className="flex items-center gap-2 text-label-lg text-on-surface">
              {status === "recording" && <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-error" />}
              {status === "paused" && <span aria-hidden className="size-2.5 rounded-full bg-outline" />}
              {status === "requesting" && <Spinner />}
              {STATUS_TEXT[status]}
            </p>

            <p
              className={cn(
                "font-display text-[4.5rem] leading-none font-semibold tabular-nums tracking-[-0.06em] sm:text-[6.5rem]",
                status === "paused" ? "text-on-surface-variant" : "text-on-surface",
              )}
              aria-label={`녹음 시간 ${formatDurationLong(elapsedMs / 1000)}`}
            >
              {formatDuration(elapsedMs / 1000)}
            </p>

            {status !== "stopped" && <div className="w-full max-w-md"><LevelMeter level={level} active={status === "recording"} /></div>}

            {isLive && remainingMs < 60_000 && (
              <p className="text-body-sm text-on-surface-variant">최대 길이까지 {Math.ceil(remainingMs / 1000)}초 남았어요.</p>
            )}

            {(status === "idle" || status === "requesting") && (
              <Button size="lg" onClick={start} disabled={status === "requesting"} className="h-16 min-w-52 rounded-full px-8">
                <Mic aria-hidden />
                녹음 시작
              </Button>
            )}

            {isLive && (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                {status === "recording" ? (
                  <Button variant="secondary" size="lg" onClick={pause}>
                    <Pause aria-hidden />
                    일시정지
                  </Button>
                ) : (
                  <Button variant="secondary" size="lg" onClick={resume}>
                    <Play aria-hidden />
                    이어서 녹음
                  </Button>
                )}
                <Button size="lg" onClick={stop}>
                  <Square aria-hidden className="fill-current" />
                  녹음 마치기
                </Button>
              </div>
            )}

            {status === "stopped" && recording && (
              <div className="w-full space-y-4 text-left">
                <audio controls src={recording.url} className="w-full" aria-label="녹음 다시 듣기" />
                <p className="text-body-md text-on-surface-variant">
                  총 {formatDurationLong(recording.durationSec)} 분량이에요. 들어보고 괜찮으면 분석을 시작하세요.
                </p>
                {hitLimit && (
                  <Notice title="최대 길이에 도달해서 녹음을 자동으로 마쳤어요">
                    {MAX_RECORDING_MS / 60000}분까지의 내용으로 분석해요.
                  </Notice>
                )}
                {tooShort && (
                  <Notice tone="error" title="분석하기에는 녹음이 너무 짧아요">
                    관중이 흐름을 판단할 수 있도록 {MIN_RECORDING_SEC}초 이상 녹음해 주세요.
                  </Notice>
                )}
                {submit.isError && (
                  <Notice
                    tone="error"
                    title="녹음을 올리지 못했어요"
                    actions={
                      <Button size="sm" onClick={handleAnalyze}>
                        다시 올리기
                      </Button>
                    }
                  >
                    {isApiError(submit.error) ? submit.error.message : "잠시 후 다시 시도해 주세요."} 녹음은 그대로 남아 있어요.
                  </Notice>
                )}
                <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                  <Button variant="secondary" size="lg" onClick={handleRerecord} disabled={submit.isPending}>
                    <RotateCcw aria-hidden />
                    다시 녹음
                  </Button>
                  <Button size="lg" onClick={handleAnalyze} disabled={tooShort || submit.isPending} aria-busy={submit.isPending}>
                    {submit.isPending ? <Spinner /> : <Sparkles aria-hidden />}
                    {submit.isPending ? "녹음을 올리는 중…" : "관중 분석 시작"}
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && error && (
              <div className="w-full text-left">
                <RecorderError kind={error} onRetry={start} />
              </div>
            )}
          </div>
        </section>
      </div>

      <aside aria-labelledby="tips-title" className="mx-auto mt-10 grid max-w-4xl gap-4 border-t border-outline-variant/60 pt-6 sm:grid-cols-3">
        <h2 id="tips-title" className="text-label-lg text-on-surface">녹음 전에</h2>
        <ul className="space-y-2 sm:col-span-2 sm:grid sm:grid-cols-3 sm:gap-5 sm:space-y-0">
          {TIPS.map((tip) => (
            <li key={tip} className="text-body-sm text-on-surface-variant">{tip}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
