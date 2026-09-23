import type { Metadata } from "next";
import { RecordingStudio } from "@/components/recorder/recording-studio";

export const metadata: Metadata = { title: "발표 녹음" };

export default function RecordPage() {
  return <RecordingStudio />;
}
