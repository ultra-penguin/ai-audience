import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { pretendard } from "@/lib/fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI 가상 관중 발표 리뷰어",
    template: "%s · AI 가상 관중 발표 리뷰어",
  },
  description:
    "발표를 녹음하면 서로 다른 AI 관중이 어디서 이해가 막히는지, 왜 막히는지, 어떻게 고치면 되는지 알려드려요.",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="flex min-h-dvh flex-col">
        <div
          hidden
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: "<!-- THESIS: AI 관중의 판단을 조용한 리포트로 읽게 하며 SaaS 대시보드 관습을 거부한다. OWN-WORLD: 쿨그레이 종이, 검은 활자, 한 가지 블루 액션과 얇은 규칙선. STORY: 발표를 시작하고, 관중의 반응을 발견하고, 한 문장을 고친다. FIRST VIEWPORT: 큰 한국어 헤드라인과 발표→관중→발견 흐름이 먼저 보인다. FORM: 운영 화면 안의 편집형 리포트, seed 1061b666. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->",
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-surface-container-lowest focus:px-4 focus:py-2 focus:text-label-lg focus:shadow-md"
        >
          본문으로 건너뛰기
        </a>
        <Providers>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
