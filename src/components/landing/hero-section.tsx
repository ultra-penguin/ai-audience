import { ArrowRight, Mic } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HeroVisual } from "./hero-visual";

export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-title"
      className="grid min-h-[calc(100svh-4.25rem)] items-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
    >
      <div className="animate-rise-in space-y-6 motion-reduce:animate-none">
        <p className="text-label-lg text-primary">AI Audience · AI로 청중을 시뮬레이션합니다.</p>
        <h1 id="hero-title" className="text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.04em] text-on-surface text-balance sm:text-[3.75rem] lg:text-[4.25rem]">
          내 발표를 듣는 사람은,
          <br />
          정말 이해하고 있을까?
        </h1>
        <p className="max-w-lg text-body-xl text-on-surface-variant">
          발표자는 자신이 무엇을 말했는지는 알 수 있습니다. 하지만 청중이 무엇을 이해했고, 어디에서 막혔는지는 알기 어렵습니다.
        </p>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link href="/record" className={buttonVariants({ size: "lg" })}>
            <Mic aria-hidden />
            내 발표 테스트하기
          </Link>
          <Link href="#perspective" className="inline-flex min-h-11 items-center gap-2 rounded text-label-lg text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline">
            어떻게 다른지 보기
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
      <HeroVisual />
    </section>
  );
}
