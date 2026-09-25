import { Mic } from "lucide-react";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn, formatDuration } from "@/lib/utils";
import { DEMO_FOCUS, PERSONA_ICON, RECEPTION_META } from "./landing-data";

const WAVE = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.55, 0.8, 0.4, 0.7, 0.95, 0.5, 0.65, 0.3];

/** Voice → three listeners → three different receptions, drawn in that order. */
export function HeroVisual() {
  const listeners = DEMO_FOCUS.listeners;
  return (
    <figure aria-labelledby="hero-visual-caption" className="relative mx-auto w-full max-w-xl">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-full bg-inverse-surface text-inverse-on-surface shadow-sm">
          <Mic aria-hidden className="size-6" />
        </span>
        <p className="text-label-sm tracking-[0.18em] text-on-surface-variant">YOUR PRESENTATION</p>
        <span aria-hidden className="flex h-8 items-center gap-1">
          {WAVE.map((h, i) => (
            <span
              key={i}
              className="w-1 origin-center rounded-full bg-on-surface animate-listen motion-reduce:animate-none"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms` }}
            />
          ))}
        </span>
      </div>

      <svg aria-hidden viewBox="0 0 300 64" preserveAspectRatio="none" className="h-14 w-full text-outline sm:h-16">
        {[50, 150, 250].map((x, i) => (
          <path
            key={x}
            d={`M150 0 C150 32 ${x} 32 ${x} 64`}
            pathLength={1}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            strokeDasharray="1"
            className="animate-draw motion-reduce:animate-none"
            style={{ animationDelay: `${250 + i * 120}ms` }}
          />
        ))}
      </svg>

      <ul className="grid grid-cols-3 gap-2 sm:gap-4">
        {listeners.map((listener, i) => {
          const Icon = PERSONA_ICON[listener.kind];
          const reception = RECEPTION_META[listener.reception];
          const ReceptionIcon = reception.icon;
          return (
            <li
              key={listener.personaId}
              className="animate-settle flex flex-col items-center gap-2 text-center motion-reduce:animate-none"
              style={{ animationDelay: `${650 + i * 140}ms` }}
            >
              <span className={cn("flex size-12 items-center justify-center rounded-full sm:size-14", PERSONA_STYLE[listener.kind].chip)}>
                <Icon aria-hidden className="size-5 sm:size-6" />
              </span>
              <span className="text-label-lg text-on-surface">{listener.name}</span>
              <span
                className={cn("animate-rise-in inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-md motion-reduce:animate-none", reception.chip)}
                style={{ animationDelay: `${1150 + i * 160}ms` }}
              >
                <ReceptionIcon aria-hidden className="size-3.5" />
                {reception.label}
              </span>
            </li>
          );
        })}
      </ul>
      <figcaption id="hero-visual-caption" className="mt-5 text-center text-label-md text-on-surface-variant">
        예시 · 같은 {formatDuration(DEMO_FOCUS.startSec)} ‘{DEMO_FOCUS.title}’ 구간을 들은 세 관중의 반응
      </figcaption>
    </figure>
  );
}

