import type { Metadata } from "next";
import { AnalysisProgress } from "@/components/analysis/analysis-progress";
import { safeDecode } from "@/lib/utils";

export const metadata: Metadata = { title: "분석 중" };

export default async function AnalyzingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalysisProgress id={safeDecode(id)} />;
}
