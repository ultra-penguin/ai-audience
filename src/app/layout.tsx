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
  themeColor: "#fbf8fc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="flex min-h-dvh flex-col">
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
