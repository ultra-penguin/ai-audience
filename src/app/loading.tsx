import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="flex justify-center px-4 py-24 text-on-surface-variant">
      <Spinner className="size-6" label="불러오는 중" />
    </div>
  );
}
