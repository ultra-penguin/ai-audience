"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

/** Route-level fallback: keeps the header and offers recovery without exposing error details. */
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-xl space-y-4 px-4 py-20 text-center">
      <h1 className="text-headline-lg text-on-surface">화면을 불러오지 못했어요</h1>
      <p className="text-body-lg text-on-surface-variant">잠시 후 다시 시도하거나 처음 화면으로 돌아가 주세요.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>다시 시도</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          처음으로
        </Link>
      </div>
    </div>
  );
}
