import { AUDIENCE_SEATS, SEAT_STATE_LABEL, type AudienceSeat, type SeatState } from "@/lib/audience";
import { PERSONA_STYLE } from "@/lib/persona-style";
import { cn } from "@/lib/utils";

const BAR_DELAYS_MS = [0, 220, 440, 140];

/** Four quiet bars; they only move while the backend says the audience is listening. */
function ListeningBars({ state, dot, offsetMs }: { state: SeatState; dot: string; offsetMs: number }) {
  const listening = state === "listening";
  return (
    <span aria-hidden className="flex h-4 items-end gap-1">
      {BAR_DELAYS_MS.map((delay, i) => (
        <span
          key={i}
          className={cn(
            "h-full w-1 origin-bottom rounded-full transition-[scale,opacity] duration-500",
            dot,
            listening ? "animate-listen motion-reduce:animate-none motion-reduce:scale-y-75" : "scale-y-[0.3]",
            state === "listened" && "opacity-70",
            (state === "waiting" || state === "stopped") && "opacity-35",
          )}
          style={listening ? { animationDelay: `${delay + offsetMs}ms` } : undefined}
        />
      ))}
    </span>
  );
}

function Seat({ seat, state, index }: { seat: AudienceSeat; state?: SeatState; index: number }) {
  const style = PERSONA_STYLE[seat.kind];
  return (
    <li
      className={cn(
        "flex gap-4 rounded-xl p-4 transition-colors duration-500 sm:flex-col sm:gap-3",
        state === "listening" ? "bg-surface-container-lowest ring-1 ring-outline-variant/60" : "bg-surface-container-low",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-label-lg transition-opacity duration-500",
          style.chip,
          state === "waiting" && "opacity-70",
        )}
      >
        {seat.glyph}
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-label-lg text-on-surface">{seat.name}</p>
        <p className="text-body-sm text-on-surface-variant">{seat.listensFor}</p>
        {state && (
          <p className="flex items-center gap-2 pt-1 text-label-md text-on-surface-variant">
            <ListeningBars state={state} dot={style.dot} offsetMs={index * 160} />
            <span className={cn(state === "listening" && "text-on-surface")}>{SEAT_STATE_LABEL[state]}</span>
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The three fixed audience perspectives, seated in front of the talk.
 * Without `state` they are a static introduction (landing page).
 */
export function AudienceSeats({ state, className }: { state?: SeatState; className?: string }) {
  return (
    <div className={className}>
      <div aria-hidden className="mb-3 flex items-center gap-3 text-label-sm text-on-surface-variant">
        <span className="h-px flex-1 bg-outline-variant/70" />
        내 발표
        <span className="h-px flex-1 bg-outline-variant/70" />
      </div>
      <ul aria-label="가상 관중" className="grid gap-3 sm:grid-cols-3">
        {AUDIENCE_SEATS.map((seat, i) => (
          <Seat key={seat.kind} seat={seat} state={state} index={i} />
        ))}
      </ul>
    </div>
  );
}
