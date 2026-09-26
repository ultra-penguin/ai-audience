import { ArrowRight, Mic } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { ExhibitionDemo } from "@/features/exhibition/demo-adapter";
import { cn, formatDurationLong } from "@/lib/utils";

/** Exhibition entry: three prepared talks, one large target each. */
export function DemoPicker({ demos }: { demos: ExhibitionDemo[] }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.25rem)] max-w-7xl flex-col justify-center gap-10 px-4 py-10 sm:px-6 lg:px-10 2xl:gap-14">
      <header className="max-w-4xl space-y-4">
        <p className="text-label-md text-primary 2xl:text-label-lg">전시 체험 · 로그인 없이 바로</p>
        <h1 className="text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.035em] text-balance text-on-surface sm:text-[3rem] 2xl:text-[4.25rem]">
          발표 하나를 고르면, 세 관중이 어디서 막히는지 보여드려요
        </h1>
        <p className="max-w-2xl text-body-lg text-on-surface-variant 2xl:text-body-xl">
          미리 준비한 예시 발표예요. 고른 뒤 시뮬레이션을 시작하면 관중이 듣고, 반응을 비교하고, 리포트를 만드는 과정을 차례로 볼 수 있어요.
        </p>
      </header>

      <ol aria-label="체험할 발표" className="grid gap-4 lg:grid-cols-3 2xl:gap-6">
        {demos.map((demo, i) => (
          <li key={demo.id} className="animate-rise-in" style={{ animationDelay: `${i * 70}ms` }}>
            <Link
              href={`/exhibition/${demo.id}`}
              className={cn(
                "group flex h-full flex-col gap-6 rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-6 transition-[border-color,box-shadow,transform] duration-200 ease-out",
                "hover:border-primary-container/60 hover:shadow-[0_6px_20px_rgba(22,22,24,0.06)] active:scale-[0.99] sm:p-7 2xl:p-9",
              )}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span aria-hidden className="text-label-lg tabular-nums text-on-surface-variant">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-label-md text-on-surface-variant">
                  {formatDurationLong(demo.result.durationSec)} · 관중 {demo.result.personas.length}명
                </span>
              </div>
              <div className="space-y-2">
                <h2 className="text-headline-lg text-on-surface 2xl:text-[2.125rem] 2xl:leading-[2.625rem]">{demo.title}</h2>
                <p className="text-body-lg text-on-surface-variant 2xl:text-body-xl">{demo.tagline}</p>
              </div>
              <blockquote className="border-l-2 border-outline-variant pl-4 text-body-md text-on-surface 2xl:text-body-lg">
                “{demo.context.excerpt}”
              </blockquote>
              <span className="mt-auto inline-flex items-center gap-2 text-label-lg text-primary">
                이 발표로 체험하기
                <ArrowRight aria-hidden className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <footer className="flex flex-col gap-3 border-t border-outline-variant/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-md text-on-surface-variant">예시 데이터로 만든 체험이에요. 녹음이나 인터넷 연결 없이 이 화면에서 바로 동작해요.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            서비스 소개
          </Link>
          <Link href="/record" className={buttonVariants({ variant: "outline" })}>
            <Mic aria-hidden />내 발표로 해보기
          </Link>
        </div>
      </footer>
    </div>
  );
}
