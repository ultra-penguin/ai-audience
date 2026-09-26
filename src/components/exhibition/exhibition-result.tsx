"use client";

import { ArrowLeft, Mic, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ResultReport } from "@/components/result/result-view";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { getExhibitionDemo } from "@/features/exhibition/demo-adapter";
import { useResultUiStore } from "@/features/result/result-ui-store";

/** The shared report for an exhibition demo, with exhibition-specific label and exits. */
export function ExhibitionResult({ demoId }: { demoId: string }) {
  const demo = getExhibitionDemo(demoId);
  const resetUi = useResultUiStore((s) => s.reset);

  useEffect(() => resetUi(), [demoId, resetUi]);

  if (!demo) return null;

  return (
    <>
      <nav aria-label="체험 이동" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pt-6 sm:px-6 lg:px-10">
        <Link href="/exhibition" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden />
          다른 발표 고르기
        </Link>
        <Link href="/record" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <Mic aria-hidden />내 발표로 해보기
        </Link>
      </nav>
      <ResultReport
        result={demo.result}
        notice={
          <Notice title="전시용 예시 리포트예요">
            실제 녹음을 분석한 결과가 아니라, 미리 준비한 예시 발표로 만든 리포트예요. 내 발표로 해보면 같은 형식의 리포트를 받을 수 있어요.
          </Notice>
        }
        closing={
          <section
            aria-labelledby="exhibition-next-title"
            className="flex flex-col items-start gap-4 rounded-xl bg-surface-container-low p-6 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <h2 id="exhibition-next-title" className="text-headline-sm text-on-surface">
                이제 내 발표를 들려줄 차례예요
              </h2>
              <p className="text-body-md text-on-surface-variant">실제 발표를 녹음하면 세 관중이 같은 방식으로 듣고 리포트를 만들어요.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/exhibition/${demo.id}`} className={buttonVariants({ variant: "ghost" })}>
                <RotateCcw aria-hidden />
                다시 보기
              </Link>
              <Link href="/exhibition" className={buttonVariants({ variant: "outline" })}>
                다른 발표 고르기
              </Link>
              <Link href="/record" className={buttonVariants()}>
                <Mic aria-hidden />내 발표로 해보기
              </Link>
            </div>
          </section>
        }
      />
    </>
  );
}
