import { ArrowRight, Mic } from "lucide-react";
import Link from "next/link";
import { FeedbackChain } from "@/components/result/feedback-chain";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersonaChip } from "@/components/ui/persona-chip";
import { SAMPLE_RESULT } from "@/mocks/sample-result";

const STEPS = [
  { title: "발표를 녹음해요", body: "브라우저에서 마이크로 평소처럼 발표하세요. 중간에 일시정지할 수 있어요." },
  { title: "가상 관중이 들어요", body: "배경지식과 관심사가 다른 관중들이 같은 발표를 각자의 시선으로 들어요." },
  { title: "고칠 곳을 확인해요", body: "누가, 어디서, 왜 막혔는지와 함께 바로 써볼 수 있는 수정 문장을 받아요." },
];

export default function LandingPage() {
  const preview = SAMPLE_RESULT.difficultSections[0];

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-8">
      <section aria-labelledby="hero-title" className="grid gap-10 py-12 md:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
        <div className="space-y-6">
          <p className="text-label-md text-on-surface-variant">발표 리허설 도구</p>
          <h1 id="hero-title" className="text-display-lg-mobile md:text-display-lg text-balance text-on-surface">
            실제 청중 앞에 서기 전에, 어디서 막히는지 먼저 들어보세요.
          </h1>
          <p className="max-w-xl text-body-xl text-on-surface-variant">
            발표를 녹음하면 서로 다른 AI 관중이 이해가 끊기는 지점을 짚고, 왜 그런지와 어떻게 고치면 되는지 알려드려요.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/record" className={buttonVariants({ size: "lg" })}>
              <Mic aria-hidden />
              발표 녹음 시작
            </Link>
            <Link href="/result/sample" className={buttonVariants({ variant: "outline", size: "lg" })}>
              샘플 결과 먼저 보기
              <ArrowRight aria-hidden />
            </Link>
          </div>
          <p className="text-body-sm text-on-surface-variant">계정 없이 바로 쓸 수 있어요. 음성만 사용하며 영상은 녹화하지 않아요.</p>
        </div>

        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-label-lg text-on-surface">이런 피드백을 받아요</p>
            <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">샘플</span>
          </div>
          <FeedbackChain section={preview} personas={SAMPLE_RESULT.personas} compact />
        </Card>
      </section>

      <section aria-labelledby="how-title" className="border-t border-outline-variant/50 py-12 md:py-16">
        <h2 id="how-title" className="text-headline-lg text-on-surface">이렇게 진행돼요</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="space-y-2">
              <span className="text-label-md text-primary">0{i + 1}</span>
              <h3 className="text-headline-sm text-on-surface">{step.title}</h3>
              <p className="text-body-md text-on-surface-variant">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="audience-title" className="border-t border-outline-variant/50 py-12 md:py-16">
        <div className="max-w-2xl space-y-3">
          <h2 id="audience-title" className="text-headline-lg text-on-surface">한 발표, 여러 관중의 시선</h2>
          <p className="text-body-lg text-on-surface-variant">
            점수 대신 관중의 입장에서 들은 그대로를 보여드려요. 어느 한 관중이 기준이 되지 않도록, 서로 다른 지식과 관심을 가진 관중이 함께 들어요.
          </p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_RESULT.personas.map((persona) => (
            <li key={persona.id} className="rounded-xl bg-surface-container-low p-5">
              <PersonaChip persona={persona} />
              <p className="mt-3 text-body-md text-on-surface">{persona.description}</p>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                <span className="text-on-surface">듣는 포인트</span> · {persona.listensFor}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-body-sm text-on-surface-variant">예시 관중 구성이에요. 실제 분석에서는 발표 주제에 맞는 3–5명의 관중이 함께 들어요.</p>
      </section>

      <section className="border-t border-outline-variant/50 py-12 md:py-16">
        <div className="flex flex-col items-start gap-5 rounded-xl bg-surface-container-low p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="space-y-1">
            <h2 className="text-headline-md text-on-surface">5분이면 첫 리허설을 해볼 수 있어요</h2>
            <p className="text-body-md text-on-surface-variant">조용한 곳에서 마이크 권한만 허용해 주세요.</p>
          </div>
          <Link href="/record" className={buttonVariants({ size: "lg" })}>
            <Mic aria-hidden />
            녹음하러 가기
          </Link>
        </div>
      </section>
    </div>
  );
}
