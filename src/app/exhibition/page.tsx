import type { Metadata } from "next";
import { DemoPicker } from "@/components/exhibition/demo-picker";
import { listExhibitionDemos } from "@/features/exhibition/demo-adapter";

export const metadata: Metadata = { title: "전시 체험" };

export default function ExhibitionPage() {
  return <DemoPicker demos={listExhibitionDemos()} />;
}
