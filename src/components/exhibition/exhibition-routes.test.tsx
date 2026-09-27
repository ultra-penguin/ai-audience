import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { listExhibitionDemos } from "@/features/exhibition/demo-adapter";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { DemoPicker } = await import("./demo-picker");
const { DemoStage } = await import("./demo-stage");
const { ExhibitionResult } = await import("./exhibition-result");
const DemoPage = (await import("@/app/exhibition/[demoId]/page")).default;
const ResultPage = (await import("@/app/exhibition/[demoId]/result/page")).default;

const params = (demoId: string) => ({ params: Promise.resolve({ demoId }) });

describe("exhibition routes", () => {
  it("offers three demos, each linking to its own stage, plus a real-presentation CTA", () => {
    const html = renderToStaticMarkup(<DemoPicker demos={listExhibitionDemos()} />);
    for (const id of ["demo-bfs", "demo-ai-ethics", "demo-recycling"]) expect(html).toContain(`href="/exhibition/${id}"`);
    expect(html).toContain('href="/record"');
    expect(html).toContain("내 발표로 해보기");
  });

  it("opens a demo on its context preview with a start action and a way back", () => {
    const html = renderToStaticMarkup(<DemoStage demoId="demo-bfs" />);
    expect(html).toContain("발표 맥락");
    expect(html).toContain("시뮬레이션 시작");
    expect(html).toContain('href="/exhibition"');
    expect(html).not.toMatch(/\d+%/);
  });

  it("renders the shared report with exhibition exits instead of the record-again footer", () => {
    const html = renderToStaticMarkup(<ExhibitionResult demoId="demo-ai-ethics" />);
    expect(html).toContain("발표 리뷰 리포트");
    expect(html).toContain("생성형 AI, 편리함 뒤에 남는 책임");
    expect(html).toContain("전시용 예시 리포트예요");
    expect(html).toContain('href="/exhibition/demo-ai-ethics"');
    expect(html).toContain('href="/record"');
    expect(html).not.toContain("새 녹음 시작");
  });

  it.each(["unknown", "sample", "%E0%A4%A"])("sends invalid id %s to not-found on both routes", async (id) => {
    await expect(DemoPage(params(id))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(ResultPage(params(id))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
