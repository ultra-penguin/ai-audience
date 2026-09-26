import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExhibitionResult } from "@/components/exhibition/exhibition-result";
import { EXHIBITION_DEMO_IDS, getExhibitionDemo } from "@/features/exhibition/demo-adapter";
import { safeDecode } from "@/lib/utils";

type Props = { params: Promise<{ demoId: string }> };

export function generateStaticParams() {
  return EXHIBITION_DEMO_IDS.map((demoId) => ({ demoId }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const demo = getExhibitionDemo(safeDecode((await params).demoId));
  return { title: demo ? `${demo.title} · 체험 결과` : "전시 체험" };
}

export default async function ExhibitionResultPage({ params }: Props) {
  const demo = getExhibitionDemo(safeDecode((await params).demoId));
  if (!demo) notFound();
  return <ExhibitionResult demoId={demo.id} />;
}
