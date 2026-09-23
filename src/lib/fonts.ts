import localFont from "next/font/local";

/**
 * Pretendard covers Latin and Hangul, standing in for Inter / Plus Jakarta Sans
 * as DESIGN (4).md recommends for CJK production. Loaded locally so builds
 * don't depend on Google Fonts.
 */
export const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});
