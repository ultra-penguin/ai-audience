// CONTRACT STUB — owned by Worker A (UI). Keep the export name and no-prop API.
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Section 10: exhibit → try it. */
export function FinalCTA() {
  return (
    <section aria-labelledby="cta-title" className="border-t border-outline-variant/60 py-16">
      <h2 id="cta-title" className="text-headline-xl text-on-surface">당신의 발표를 청중의 시선으로 다시 들어보세요.</h2>
      <Link href="/record" className={buttonVariants({ size: "lg" })}>발표 테스트 시작 →</Link>
    </section>
  );
}
