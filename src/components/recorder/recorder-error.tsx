import type { RecorderErrorKind } from "@/features/recording/recorder-store";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

const COPY: Record<RecorderErrorKind, { title: string; body: string; retry: boolean }> = {
  permission_denied: {
    title: "마이크 권한이 꺼져 있어요",
    body: "주소창 왼쪽의 사이트 설정(자물쇠 아이콘)에서 마이크를 ‘허용’으로 바꾼 뒤 다시 시도해 주세요.",
    retry: true,
  },
  no_device: {
    title: "사용할 수 있는 마이크를 찾지 못했어요",
    body: "마이크나 이어폰이 연결되어 있는지 확인한 뒤 다시 시도해 주세요.",
    retry: true,
  },
  device_busy: {
    title: "다른 앱이 마이크를 사용 중이에요",
    body: "화상회의나 녹음 앱을 종료한 뒤 다시 시도해 주세요.",
    retry: true,
  },
  unsupported: {
    title: "이 브라우저에서는 녹음을 지원하지 않아요",
    body: "최신 버전의 Chrome, Edge, Safari 또는 Firefox에서 다시 열어 주세요.",
    retry: false,
  },
  insecure: {
    title: "보안 연결에서만 녹음할 수 있어요",
    body: "브라우저는 https 주소(또는 localhost)에서만 마이크 사용을 허용해요. 주소를 확인해 주세요.",
    retry: false,
  },
  unknown: {
    title: "녹음을 시작하지 못했어요",
    body: "잠시 후 다시 시도해 주세요. 문제가 계속되면 페이지를 새로고침해 주세요.",
    retry: true,
  },
};

export function RecorderError({ kind, onRetry }: { kind: RecorderErrorKind; onRetry: () => void }) {
  const copy = COPY[kind];
  return (
    <Notice
      tone="error"
      title={copy.title}
      actions={
        copy.retry && (
          <Button size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        )
      }
    >
      {copy.body}
    </Notice>
  );
}
