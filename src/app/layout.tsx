import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppProviders } from "@/components/providers/app-providers";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { buildCanonicalUrl, defaultDescription, defaultOgImage, defaultTitle, getBaseUrl, siteName } from "@/lib/seo";
import "./globals.css";

const googleAnalyticsId =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: defaultTitle,
    template: "%s | Quizora"
  },
  description: defaultDescription,
  alternates: {
    canonical: buildCanonicalUrl("/")
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
  },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: buildCanonicalUrl("/"),
    siteName,
    type: "website",
    images: [
      {
        url: defaultOgImage(),
        width: 1200,
        height: 630,
        alt: "Quizora premium quiz arena"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultOgImage()]
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f1e3" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1422" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {googleAnalyticsId ? (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `}
            </Script>
          </>
        ) : null}
        <AppProviders>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
