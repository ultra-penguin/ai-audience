import { ArrowDown, Mic } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { HeroVisual } from "./hero-visual";

/** First viewport: the question, the action, and the mechanism (voice → listeners → reactions) side by side. */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-title"
      className="grid items-center gap-10 pb-14 pt-10 sm:pt-14 lg:min-h-[calc(100svh-4.25rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:py-10 2xl:gap-20"
    >
      <div className="animate-rise-in space-y-6 motion-reduce:animate-none lg:space-y-7">
        <p className="text-label-lg text-primary">AI Audience · AI로 청중을 시뮬레이션합니다.</p>
        <h1
          id="hero-title"
          className="text-[2.25rem] font-semibold leading-[1.14] tracking-[-0.04em] text-on-surface text-balance break-keep sm:text-[3.5rem] lg:text-[3.75rem] xl:text-[4.25rem]"
        >
          내 발표를 듣는 사람은,
          <br />
          정말 이해하고 있을까?
        </h1>
        <p className="max-w-xl text-body-lg text-on-surface-variant break-keep sm:text-body-xl 2xl:text-[1.25rem] 2xl:leading-[2rem]">
          발표자는 자신이 무엇을 말했는지는 알 수 있습니다. 하지만 청중이 무엇을 이해했고, 어디에서 막혔는지는 알기 어렵습니다.
        </p>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
          <Link href="/record" className={buttonVariants({ size: "lg" })}>
            <Mic aria-hidden />
            내 발표 테스트하기
          </Link>
          <Link
            href="#perspective"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-label-lg text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline"
          >
            어떻게 다른지 보기
            <ArrowDown aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
      <div className="w-full min-w-0 lg:pl-4">
        <HeroVisual />
      </div>
    </section>
  );
}
