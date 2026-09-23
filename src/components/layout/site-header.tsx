import Link from "next/link";
import { isMockApi } from "@/shared/api";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-surface-container-lowest/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-md text-headline-sm text-on-surface">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-primary-container">
            <span className="flex gap-0.5">
              <span className="size-1.5 rounded-full bg-secondary-fixed" />
              <span className="size-1.5 rounded-full bg-on-primary" />
              <span className="size-1.5 rounded-full bg-tertiary-fixed" />
            </span>
          </span>
          <span className="hidden sm:inline">AI 가상 관중 발표 리뷰어</span>
          <span className="sm:hidden">AI 가상 관중</span>
        </Link>
        {isMockApi && (
          <span
            className="rounded bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant"
            title="실제 분석 서버 대신 샘플 데이터를 사용하고 있어요."
          >
            샘플 데이터 모드
          </span>
        )}
      </div>
    </header>
  );
}
