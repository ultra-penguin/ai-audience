// CONTRACT STUB — owned by Worker B (motion): add the count-up; keep this props API.
/**
 * A research number shown with its context. Server HTML and reduced-motion
 * users must always see the final value; the number never appears without its context line.
 */
export function EvidenceMetric({ value, decimals = 1, suffix = "%", context }: { value: number; decimals?: number; suffix?: string; context: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[3rem] font-semibold leading-none tracking-[-0.04em] text-on-surface tabular-nums sm:text-[3.5rem]">
        {value.toFixed(decimals)}
        {suffix}
      </p>
      <p className="text-body-md text-on-surface-variant">{context}</p>
    </div>
  );
}
