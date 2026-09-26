import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** Unknown demo ids land here instead of the generic 404, with a way back into the exhibit. */
export default function ExhibitionNotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-20 text-center">
      <h1 className="text-headline-lg text-on-surface">이 체험 발표를 찾을 수 없어요</h1>
      <p className="text-body-lg text-on-surface-variant">주소가 바뀌었거나 준비되지 않은 발표예요. 준비된 세 가지 발표 중에서 골라 주세요.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/exhibition" className={buttonVariants()}>
          체험 발표 고르기
        </Link>
        <Link href="/record" className={buttonVariants({ variant: "outline" })}>
          내 발표로 해보기
        </Link>
      </div>
    </div>
  );
}
