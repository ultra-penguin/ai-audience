import Link from "next/link";
import { isMockApi } from "@/shared/api";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant/45 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5 rounded-md text-label-lg text-on-surface">
          <span aria-hidden className="relative flex size-5 items-center justify-center rounded-full border-[1.5px] border-on-surface">
            <span className="size-1.5 rounded-full bg-primary" />
          </span>
          <span className="hidden sm:inline">AI 가상 관중 발표 리뷰어</span>
          <span className="sm:hidden">AI 가상 관중</span>
        </Link>
        <nav aria-label="주요 메뉴" className="flex items-center gap-2">
          {isMockApi && <span className="hidden text-label-sm text-on-surface-variant sm:inline" title="실제 분석 서버 대신 샘플 데이터를 사용하고 있어요.">샘플 모드</span>}
          <Link href="/record" className={buttonVariants({ size: "sm", variant: "secondary" })}>새 발표</Link>
        </nav>
      </div>
    </header>
  );
}
