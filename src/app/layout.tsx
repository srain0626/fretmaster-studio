import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { BugReportProvider } from "@/components/feedback/BugReportContext";
import { AuthProvider } from "@/lib/auth";
import { LocaleProvider } from "@/lib/i18n";
import { SITE_URL } from "@/lib/siteConfig";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans-en",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();
const GTM_ID = (process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-5PHL3X34").trim();
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const GOOGLE_TAG_INIT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
`;
const SITE_TITLE = "FretMaster Studio — Interactive Electric Guitar Lessons";
const SITE_DESCRIPTION =
  "Go beyond memorizing TAB numbers. Learn electric guitar across 39 interactive lessons with real-time note, chord, and bend coaching, slow-motion hand posture guides, and automatic progress sync.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | FretMaster Studio",
  },
  description: SITE_DESCRIPTION,
  applicationName: "FretMaster Studio",
  category: "education",
  authors: [{ name: "Ray Kim", url: "https://github.com/srain0626" }],
  creator: "Ray Kim",
  publisher: "FretMaster Studio",
  keywords: [
    "electric guitar learning",
    "guitar fretboard harmony",
    "interactive guitar lessons",
    "guitar pitch detection",
    "AudioWorklet YIN",
    "pentatonic scale",
    "guitar ear training",
    "guitar ear copy",
    "일렉트릭 기타 독학",
    "기타 지판 화성학",
    "기타 연습 웹앱",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "FretMaster Studio",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["ko_KR"],
    images: [
      {
        url: "/og-thumbnail.jpg",
        width: 1376,
        height: 768,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-thumbnail.jpg"],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "FretMaster Studio",
      alternateName: "FretMaster",
      url: `${SITE_URL}/`,
      isPartOf: {
        "@type": "WebSite",
        name: "seltum.xyz",
        url: "https://seltum.xyz",
      },
    },
    {
      "@type": "WebApplication",
      name: "FretMaster Studio",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: ["en", "ko"],
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      image: `${SITE_URL}/og-thumbnail.jpg`,
      screenshot: `${SITE_URL}/og-thumbnail.jpg`,
      softwareVersion: "0.4.0",
      license: "https://www.gnu.org/licenses/gpl-3.0.html",
      author: {
        "@type": "Person",
        name: "Ray Kim",
        url: "https://github.com/srain0626",
      },
    },
  ],
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var pref = localStorage.getItem('fretmaster_theme') || 'system';
    var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = pref === 'dark' || (pref === 'system' && sysDark);
    var root = document.documentElement;
    root.classList.toggle('dark', isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <head>
        {!GA_ID && GTM_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
            />
            <script dangerouslySetInnerHTML={{ __html: GOOGLE_TAG_INIT_SCRIPT }} />
          </>
        )}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
        {!GA_ID && GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
              title="Google Tag Manager"
            />
          </noscript>
        )}
        <LocaleProvider>
          <AuthProvider>
            <BugReportProvider>
              <PageViewTracker />
              <TooltipProvider delay={160}>{children}</TooltipProvider>
            </BugReportProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
      {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
    </html>
  );
}
