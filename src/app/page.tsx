import { ArrowDown, ArrowRight, Mic } from "lucide-react";
import Link from "next/link";
import { AudienceSeats } from "@/components/audience/audience-seats";
import { FeedbackChain } from "@/components/result/feedback-chain";
import { buttonVariants } from "@/components/ui/button";
import { SAMPLE_RESULT } from "@/mocks/sample-result";

const STEPS = [
  { title: "발표를 들려주세요", body: "실제 목소리로 평소처럼 발표하면 돼요." },
  { title: "세 관중이 들어요", body: "배경지식이 다른 관중이 같은 발표를 각자의 시선으로 봅니다." },
  { title: "막힌 곳을 발견해요", body: "어디서, 왜 이해가 끊겼는지 다음 문장까지 연결해 보여드려요." },
];

export default function LandingPage() {
  const preview = SAMPLE_RESULT.difficultSections[0];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <section aria-labelledby="hero-title" className="grid min-h-[calc(100svh-4.25rem)] items-center gap-16 py-16 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-24 lg:py-20">
        <div className="max-w-2xl space-y-8">
          <h1 id="hero-title" className="max-w-xl text-[2.75rem] font-semibold leading-[1.06] tracking-[-0.04em] text-on-surface text-balance sm:text-[4.25rem]">
            발표하기 전에,<br />
            <span className="text-primary">관중에게 먼저</span><br />
            들려보세요.
          </h1>
          <p className="max-w-lg text-body-xl text-on-surface-variant">
            실제 발표를 녹음하면 서로 다른 AI 관중이 어디서 이해하고, 어디서 멈췄는지 알려드려요.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href="/record" className={buttonVariants({ size: "lg" })}>
              <Mic aria-hidden />
              발표 시작하기
            </Link>
            <Link href="#how-title" className="inline-flex items-center gap-2 rounded text-label-lg text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline">
              어떻게 듣는지 보기
              <ArrowDown aria-hidden className="size-4" />
            </Link>
          </div>
          <p className="text-body-sm text-on-surface-variant">계정 없이 시작 · 음성만 사용 · 영상은 녹화하지 않아요</p>
        </div>

        <div className="relative border-y border-outline-variant/60 py-8 sm:py-12">
          <div className="mb-8 flex items-center gap-3 text-label-md text-on-surface-variant">
            <span className="size-2 rounded-full bg-primary" />
            <span>발표가 관중에게 도착하는 순간</span>
            <span aria-hidden className="h-px flex-1 bg-outline-variant/70" />
          </div>
          <AudienceSeats className="[&>div:first-child]:hidden" />
          <div className="mt-8 flex items-center gap-3 text-label-md text-on-surface-variant">
            <span aria-hidden className="h-px w-12 bg-outline-variant/70" />
            <ArrowRight aria-hidden className="size-4 text-primary" />
            <span>관중의 반응이 리포트가 됩니다</span>
          </div>
          <div className="mt-6 max-w-md border-l-2 border-primary pl-5">
            <p className="text-label-md text-on-surface-variant">샘플 발견</p>
            <p className="mt-2 text-headline-sm text-on-surface">“여기서 핵심 개념의 설명이 부족했어요.”</p>
          </div>
        </div>
      </section>

      <section id="how-title" aria-labelledby="how-heading" className="scroll-mt-24 border-t border-outline-variant/60 py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <h2 id="how-heading" className="max-w-sm text-headline-xl text-on-surface">복잡한 분석을<br />간단한 흐름으로.</h2>
          </div>
          <ol className="divide-y divide-outline-variant/60 border-y border-outline-variant/60">
            {STEPS.map((step, index) => (
              <li key={step.title} className="grid gap-3 py-6 sm:grid-cols-[3rem_1fr] sm:gap-5">
                <span className="text-label-md tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span>
                <div className="space-y-1.5">
                  <h3 className="text-headline-sm text-on-surface">{step.title}</h3>
                  <p className="max-w-xl text-body-md text-on-surface-variant">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="audience-title" className="border-t border-outline-variant/60 py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div className="space-y-3">
            <h2 id="audience-title" className="text-headline-xl text-on-surface">한 명의 기준으로<br />판단하지 않아요.</h2>
            <p className="max-w-sm text-body-lg text-on-surface-variant">비전공자, 일반 관중, 전문가가 같은 발표를 다르게 받아들이는 지점을 비교합니다.</p>
          </div>
          <div className="space-y-8">
            <AudienceSeats className="[&>div:first-child]:hidden" />
            <div className="max-w-xl border-t border-outline-variant/60 pt-6">
              <FeedbackChain section={preview} personas={SAMPLE_RESULT.personas} compact />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-outline-variant/60 py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-3">
            <h2 className="text-headline-xl text-on-surface">다음 발표는<br />더 잘 전달되도록.</h2>
            <p className="text-body-lg text-on-surface-variant">첫 리허설은 몇 분이면 충분해요.</p>
          </div>
          <Link href="/record" className={buttonVariants({ size: "lg" })}>
            <Mic aria-hidden />
            녹음 시작하기
          </Link>
        </div>
      </section>
    </div>
  );
}
