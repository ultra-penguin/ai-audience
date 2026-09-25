import { AnalysisTimeline } from "@/components/landing/analysis-timeline";
import { AudienceSection } from "@/components/landing/audience-section";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { PersonaSimulation } from "@/components/landing/persona-simulation";
import { PerspectiveShift } from "@/components/landing/perspective-shift";
import { ProblemSection } from "@/components/landing/problem-section";
import { ResearchEvidence } from "@/components/landing/research-evidence";
import { ResultDemo } from "@/components/landing/result-demo";

/** Exhibit story: presentation → audience → the presenter can't see understanding → evidence → simulate the audience. */
export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
      <HeroSection />
      <ProblemSection />
      <ResearchEvidence />
      <PerspectiveShift />
      <AudienceSection />
      <PersonaSimulation />
      <AnalysisTimeline />
      <ResultDemo />
      <ComparisonSection />
      <FinalCTA />
    </div>
  );
}
