import type { Metadata } from "next";
import { Overpass, Overpass_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getT } from "@/i18n/server";
import { I18nProvider } from "@/i18n/provider";
import "./globals.css";

const overpass = Overpass({
  variable: "--font-overpass",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const overpassMono = Overpass_Mono({
  variable: "--font-overpass-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fura — Fleet Movements & Payments",
  description: "Dispatch ledger for tracking truck movements, drivers and money.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, t } = await getT();
  return (
    <html
      lang={locale}
      className={`${overpass.variable} ${overpassMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <I18nProvider locale={locale} dictionary={t}>
          {children}
          <Toaster position="top-right" />
        </I18nProvider>
      </body>
    </html>
  );
}
