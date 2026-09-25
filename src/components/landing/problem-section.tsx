import { Eye, Lightbulb, MessageSquareText } from "lucide-react";
import { Reveal } from "./reveal";
import { SectionIntro } from "./section-intro";

const PROBLEMS = [
  { icon: Lightbulb, title: "이해", question: "내가 설명한 개념을 청중도 이해했을까?", body: "내 머릿속에서는 당연한 설명이 처음 듣는 사람에게는 빈칸일 수 있어요." },
  { icon: MessageSquareText, title: "전달", question: "내가 의도한 의미가 제대로 전달됐을까?", body: "같은 문장도 듣는 사람의 배경에 따라 다른 의미로 남아요." },
  { icon: Eye, title: "집중", question: "청중은 발표의 어느 순간부터 집중을 잃었을까?", body: "발표자는 말하는 동안 청중의 집중이 흔들리는 순간을 보기 어려워요." },
] as const;

export function ProblemSection() {
  return (
    <section aria-labelledby="problem-title" className="space-y-8 border-t border-outline-variant/60 py-14 md:space-y-10 md:py-20">
      <SectionIntro id="problem-title" eyebrow="문제" title={<>발표자는 청중의 머릿속을<br className="hidden sm:block" /> 볼 수 없습니다.</>} />
      <Reveal>
        <ul className="grid gap-px overflow-hidden rounded-2xl bg-outline-variant/60 ring-1 ring-outline-variant/60 md:grid-cols-3">
          {PROBLEMS.map(({ icon: Icon, title, question, body }) => (
            <li key={title} className="space-y-3 bg-surface-container-lowest p-6 sm:p-7">
              <p className="flex items-center gap-2 text-label-lg text-primary">
                <Icon aria-hidden className="size-4" />
                {title}
              </p>
              <h3 className="text-headline-md text-on-surface text-pretty break-keep">{question}</h3>
              <p className="text-body-md text-on-surface-variant break-keep">{body}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
