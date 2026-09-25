import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

const FOOTER = ["1개의 발표", "여러 명의 관중", "새로운 관점"];

/** Section 10: the one sentence to leave with, then exhibit → try it. */
export function FinalCTA() {
  return (
    <section aria-labelledby="cta-title" className="border-t border-outline-variant/60 py-16 md:py-24">
      <Reveal className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
        <div className="space-y-4">
          <p className="text-[1.75rem] font-semibold leading-[1.25] tracking-[-0.03em] text-on-surface text-balance break-keep sm:text-[2.5rem] 2xl:text-[3rem]">
            AI가 발표를 평가하는 것이 아니라, <span className="text-primary">AI로 청중을 시뮬레이션합니다.</span>
          </p>
          <p className="text-body-lg text-on-surface-variant break-keep sm:text-body-xl">발표자가 본 발표가 아니라 청중이 받아들인 발표를 분석합니다.</p>
        </div>

        <div className="flex w-full flex-col items-center gap-6 rounded-2xl bg-inverse-surface px-5 py-10 text-inverse-on-surface sm:px-10 sm:py-12">
          <h2 id="cta-title" className="text-headline-lg text-balance break-keep sm:text-headline-xl">
            당신의 발표를 청중의 시선으로 다시 들어보세요.
          </h2>
          <Link
            href="/record"
            className={cn(buttonVariants({ size: "lg" }), "h-14 px-8 text-body-lg font-semibold focus-visible:outline-inverse-primary")}
          >
            발표 테스트 시작 <span aria-hidden>→</span>
          </Link>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-label-lg text-inverse-on-surface/70">
            {FOOTER.map((item, i) => (
              <span key={item} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden>·</span>}
                {item}
              </span>
            ))}
          </p>
        </div>
      </Reveal>
    </section>
  );
}
