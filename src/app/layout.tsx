import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { pretendard } from "@/lib/fonts";
import { Providers } from "./providers";
import "./globals.css";

const SITE_NAME = "AI 가상 관중 발표 리뷰어";
const SITE_DESCRIPTION =
  "발표를 녹음하면 서로 다른 AI 관중이 어디서 이해가 막히는지, 왜 막히는지, 어떻게 고치면 되는지 알려드려요.";

/** Optional public origin for absolute OG URLs; without it Next falls back to the deployment URL. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
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
