import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-20 text-center">
      <h1 className="text-headline-lg text-on-surface">페이지를 찾을 수 없어요</h1>
      <p className="text-body-lg text-on-surface-variant">주소를 다시 확인하거나 처음 화면으로 돌아가 주세요.</p>
      <Link href="/" className={buttonVariants()}>
        처음으로
      </Link>
    </div>
  );
}
