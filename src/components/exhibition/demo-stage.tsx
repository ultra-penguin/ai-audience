"use client";

import { ArrowLeft, ArrowRight, Check, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AudienceSeats } from "@/components/audience/audience-seats";
import { RECEPTION_META } from "@/components/landing/landing-data";
import { Button, buttonVariants } from "@/components/ui/button";
import { getExhibitionDemo, type ExhibitionDemo, type SimulationSection } from "@/features/exhibition/demo-adapter";
import {
  PHASE_STEPS,
  SIMULATION_TIMING,
  simulationFrame,
  stepState,
  type SimulationFrame,
  type SimulationPhase,
} from "@/features/exhibition/simulation";
import { PERSONA_STYLE } from "@/lib/persona-style";
import type { SeatState } from "@/lib/audience";
import { cn, formatDuration } from "@/lib/utils";

const TICK_MS = 100;

/** Preview → simulation → hand-off to the shared report, for one exhibition demo. */
export function DemoStage({ demoId }: { demoId: string }) {
  // The route validated the id; a null here would mean the catalog changed under it.
  const demo = getExhibitionDemo(demoId);
  if (!demo) return null;
  return <Stage key={demo.id} demo={demo} />;
}

function Stage({ demo }: { demo: ExhibitionDemo }) {
  const router = useRouter();
  const resultHref = `/exhibition/${demo.id}/result` as const;
  const [previewSettled, setPreviewSettled] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const frame = elapsed === null ? null : simulationFrame(elapsed, demo.sections.length);
  const phase: SimulationPhase = frame?.phase ?? "preview";

  useEffect(() => {
    const t = window.setTimeout(() => setPreviewSettled(true), SIMULATION_TIMING.previewMs);
    return () => window.clearTimeout(t);
  }, []);

  const running = elapsed !== null && phase !== "done";
  useEffect(() => {
    if (!running) return;
    const startedAt = performance.now() - (elapsed ?? 0);
    const id = window.setInterval(() => setElapsed(performance.now() - startedAt), TICK_MS);
    return () => window.clearInterval(id);
    // Restart the clock only when the run starts or stops, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = window.setTimeout(() => router.push(resultHref), SIMULATION_TIMING.handoffMs);
    return () => window.clearTimeout(t);
  }, [phase, router, resultHref]);

  function start() {
    router.prefetch(resultHref);
    setElapsed(0);
    // Keep keyboard and screen-reader users on the part of the page that just changed.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.25rem)] max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 2xl:gap-10 2xl:py-12">
      <nav aria-label="체험 이동" className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/exhibition" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden />
          다른 발표 고르기
        </Link>
        {phase !== "preview" && (
          <Link href={resultHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            건너뛰고 결과 보기
            <ArrowRight aria-hidden />
          </Link>
        )}
      </nav>

      {phase === "preview" ? (
        <Preview demo={demo} settled={previewSettled} onStart={start} />
      ) : (
        <Simulation demo={demo} frame={frame!} headingRef={headingRef} resultHref={resultHref} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

function Preview({ demo, settled, onStart }: { demo: ExhibitionDemo; settled: boolean; onStart: () => void }) {
  const { context } = demo;
  const facts = [
    { label: "발표자", value: context.speaker },
    { label: "상황", value: context.situation },
    { label: "듣는 사람", value: context.audience },
    { label: "길이", value: `${formatDuration(demo.result.durationSec)}` },
  ];
  return (
    <section aria-labelledby="preview-title" className="grid flex-1 content-center gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16 2xl:gap-24">
      <div className="space-y-8">
        <div className="space-y-3 animate-rise-in">
          <p className="text-label-md text-primary 2xl:text-label-lg">발표 맥락</p>
          <h1 id="preview-title" className="text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.035em] text-balance text-on-surface sm:text-[3rem] 2xl:text-[4rem]">
            {demo.result.title}
          </h1>
        </div>
        <blockquote
          className="animate-rise-in border-l-2 border-primary-container pl-5 text-body-xl text-on-surface 2xl:text-[1.5rem] 2xl:leading-[2.25rem]"
          style={{ animationDelay: "500ms" }}
        >
          “{context.excerpt}”
        </blockquote>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {facts.map((f, i) => (
            <div key={f.label} className="animate-rise-in space-y-1" style={{ animationDelay: `${900 + i * 150}ms` }}>
              <dt className="text-label-sm text-on-surface-variant">{f.label}</dt>
              <dd className="text-body-md text-on-surface 2xl:text-body-lg">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col justify-center gap-6 rounded-xl bg-surface-container-low p-6 sm:p-8 2xl:p-10">
        <AudienceSeats state="waiting" />
        <div className="space-y-3">
          <p role="status" className="text-body-md text-on-surface-variant">
            {settled ? "준비됐어요. 세 관중이 이 발표를 들을 차례예요." : "관중이 자리에 앉고 있어요…"}
          </p>
          <Button
            size="lg"
            onClick={onStart}
            className={cn("w-full sm:w-auto", settled && "shadow-[0_0_0_4px_rgba(59,102,237,0.16)]")}
          >
            <Play aria-hidden />
            시뮬레이션 시작
          </Button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

function seatStateFor(phase: SimulationPhase): SeatState {
  return phase === "listening" ? "listening" : phase === "preview" ? "waiting" : "listened";
}

function Simulation({
  demo,
  frame,
  headingRef,
  resultHref,
}: {
  demo: ExhibitionDemo;
  frame: SimulationFrame;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  resultHref: `/exhibition/${string}/result`;
}) {
  const { phase } = frame;
  const current = frame.current >= 0 ? demo.sections[frame.current] : undefined;
  const statusText =
    phase === "listening" && current
      ? `‘${current.section.title}’ 구간을 듣고 있어요.`
      : phase === "comparing"
        ? "세 관중의 반응을 구간별로 맞대어 보고 있어요."
        : phase === "writing"
          ? "막힌 이유와 고칠 문장을 리포트로 정리하고 있어요."
          : "리포트가 준비됐어요. 곧 결과 화면으로 넘어가요.";

  return (
    <section aria-labelledby="sim-title" className="grid flex-1 gap-8 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] lg:content-center lg:gap-12 2xl:grid-cols-[22rem_minmax(0,1fr)] 2xl:gap-14">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-label-md text-primary">시뮬레이션</p>
          <h1 id="sim-title" ref={headingRef} tabIndex={-1} className="text-headline-lg text-on-surface 2xl:text-headline-xl">
            {demo.result.title}
          </h1>
        </div>
        <ol aria-label="진행 단계" className="space-y-1">
          {PHASE_STEPS.map((step) => {
            const state = stepState(step.phase, phase);
            return (
              <li
                key={step.phase}
                aria-current={state === "active" ? "step" : undefined}
                className={cn(
                  "flex gap-3 rounded-xl px-3 py-3 transition-colors duration-300",
                  state === "active" && "bg-surface-container-lowest",
                )}
              >
                <StepMark state={state} />
                <div className="min-w-0 space-y-0.5">
                  <p className={cn("text-label-lg", state === "pending" ? "text-on-surface-variant" : "text-on-surface")}>
                    {step.label}
                    <span className="sr-only">{state === "done" ? " (완료)" : state === "active" ? " (진행 중)" : " (대기)"}</span>
                  </p>
                  <p className="text-body-sm text-on-surface-variant">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p role="status" aria-live="polite" className="text-body-md text-on-surface">
          {statusText}
        </p>
        {phase === "done" && (
          <Link href={resultHref} className={cn(buttonVariants({ size: "lg" }), "w-full animate-rise-in sm:w-auto")}>
            결과 보기
            <ArrowRight aria-hidden />
          </Link>
        )}
      </div>

      <div className="min-w-0 space-y-8">
        <AudienceSeats state={seatStateFor(phase)} />
        <SectionTrack demo={demo} frame={frame} />
        {demo.result.discovery && <Finding demo={demo} phase={phase} />}
      </div>
    </section>
  );
}

function StepMark({ state }: { state: "done" | "active" | "pending" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
        state === "done" && "border-primary bg-primary text-on-primary",
        state === "active" && "border-primary",
        state === "pending" && "border-outline-variant",
      )}
    >
      {state === "done" && <Check className="size-3" strokeWidth={3} />}
      {state === "active" && <span className="size-2 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />}
    </span>
  );
}

/** The talk's sections in speaking order; each fills with reactions once it has been heard. */
function SectionTrack({ demo, frame }: { demo: ExhibitionDemo; frame: SimulationFrame }) {
  const comparing = frame.phase !== "listening";
  return (
    <ol aria-label="발표 구간별 관중 반응" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {demo.sections.map((item, i) => {
        const heard = i < frame.heard;
        const active = i === frame.current;
        const focus = comparing && i === demo.focusIndex;
        return (
          <li
            key={item.section.id}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 transition-[border-color,background-color,opacity] duration-300 2xl:p-5",
              active ? "border-primary-container bg-surface-container-lowest" : "border-outline-variant/70",
              focus && "border-primary-container bg-surface-container-lowest",
              comparing && !focus && demo.focusIndex >= 0 && "opacity-60",
            )}
          >
            <div className="space-y-1">
              <p className="flex items-baseline justify-between gap-2 text-label-sm text-on-surface-variant">
                <span>구간 {i + 1}</span>
                {item.section.startSec !== undefined && <span className="tabular-nums">{formatDuration(item.section.startSec)}</span>}
              </p>
              <p className="text-headline-sm text-on-surface">{item.section.title}</p>
              {active && item.section.summary && <p className="animate-rise-in text-body-sm text-on-surface-variant">{item.section.summary}</p>}
            </div>
            <SectionReactions item={item} heard={heard} active={active} />
          </li>
        );
      })}
    </ol>
  );
}

function SectionReactions({ item, heard, active }: { item: SimulationSection; heard: boolean; active: boolean }) {
  if (!heard) {
    return (
      <p className="mt-auto text-body-sm text-on-surface-variant">{active ? "듣는 중…" : "아직 듣지 않았어요"}</p>
    );
  }
  return (
    <ul className="mt-auto space-y-1.5">
      {item.reactions.map(({ persona, cell }, i) => {
        const meta = RECEPTION_META[cell.reception];
        const Icon = meta.icon;
        return (
          <li
            key={persona.id}
            className="flex animate-settle items-center justify-between gap-2 text-label-md"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-on-surface">
              <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", PERSONA_STYLE[persona.kind].dot)} />
              <span className="truncate">{persona.name}</span>
            </span>
            <span className={cn("flex shrink-0 items-center gap-1", meta.tone)}>
              <Icon aria-hidden className="size-3.5" />
              {meta.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The cross-check's finding, then what the report will contain. */
function Finding({ demo, phase }: { demo: ExhibitionDemo; phase: SimulationPhase }) {
  const { result } = demo;
  const questions = result.naturalQuestions?.length ?? 0;
  const contents = [
    `막힌 구간 ${result.difficultSections.length}곳과 그 이유`,
    `고쳐 말할 문장 ${result.difficultSections.filter((d) => d.improvement.rewrite).length}개`,
    ...(questions ? [`관중이 떠올릴 질문 ${questions}개`] : []),
  ];
  return (
    // Space is held from the start so the finding arrives without pushing the layout around.
    <div className="grid gap-6 border-t border-outline-variant/60 pt-6 md:min-h-[10rem] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-10">
      {phase === "listening" ? (
        <div className="space-y-2">
          <p className="text-label-md text-on-surface-variant">가장 크게 갈린 곳</p>
          <p className="text-body-lg text-on-surface-variant">모든 구간을 들은 뒤, 관중 반응이 가장 크게 갈린 곳을 짚어 드려요.</p>
        </div>
      ) : (
        <div className="animate-rise-in space-y-2">
          <p className="text-label-md text-primary">가장 크게 갈린 곳</p>
          <p className="text-headline-md text-balance text-on-surface 2xl:text-headline-lg">{result.discovery!.headline}</p>
        </div>
      )}
      {(phase === "writing" || phase === "done") && (
        <div className="space-y-2">
          <p className="text-label-md text-on-surface-variant">리포트에 담기는 내용</p>
          <ul className="space-y-1.5">
            {contents.map((text, i) => (
              <li key={text} className="flex animate-rise-in items-center gap-2 text-body-md text-on-surface" style={{ animationDelay: `${i * 220}ms` }}>
                <Check aria-hidden className="size-4 text-primary" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
