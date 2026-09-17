import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Noto_Serif, Public_Sans } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

const publicSansHeading = Public_Sans({ subsets: ["latin"], variable: "--font-heading" });
const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-serif" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "큐브 흰 십자가 만들기",
  description: "섞인 3x3 큐브에서 흰 십자가까지 한 동작씩 따라 돌려 보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        "font-serif",
        notoSerif.variable,
        publicSansHeading.variable
      )}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
