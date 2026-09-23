import type { Metadata } from "next";
import { ResultView } from "@/components/result/result-view";
import { safeDecode } from "@/lib/utils";

export const metadata: Metadata = { title: "리뷰 결과" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultView id={safeDecode(id)} />;
}
