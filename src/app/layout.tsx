import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import { FontSizeProvider } from '@/components/font-size-provider';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const bornAgainLogoUrl = 'https://i.postimg.cc/K8VD8BYD/Born-Again-Mountain-Sunrise-Emblem.png';

export const metadata: Metadata = {
  metadataBase: new URL('https://bornagainglobal.com'),
  title: {
    default: 'BornAgain | Global Christian Identity & Evangelism Platform',
    template: '%s | BornAgain',
  },
  description:
    'BornAgain is the global platform for the new creation in Christ. Share the greatness of GOD, join soul-winning campaigns, and track the harvest of the redeemed.',
  keywords: [
    'BornAgain',
    'BornAgain Global',
    'BornAgain App',
    'Christian Testimonies',
    'New Creation',
    'Miracle Stories',
    'Soul Winning',
    'Great Commission',
    'Evangelism Tool',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BornAgain',
  },
  authors: [{ name: 'BornAgain Team' }],
  creator: 'BornAgain',
  publisher: 'BornAgain',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'BornAgain - Are you BornAgain?',
    description: 'BornAgain is empowering the Great Commission through technology. Share testimonies and track souls won globally as a new creation.',
    url: 'https://bornagainglobal.com',
    siteName: 'BornAgain',
    images: [
      {
        url: bornAgainLogoUrl,
        width: 1200,
        height: 630,
        alt: 'BornAgain - Christian Identity Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BornAgain | Global Evangelism Platform',
    description: 'The premier platform for the new creation. Record miracle stories and manage soul-winning campaigns.',
    images: [bornAgainLogoUrl],
    creator: '@bornagainglobal',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: bornAgainLogoUrl, type: 'image/png', sizes: '192x192' },
      { url: bornAgainLogoUrl, type: 'image/png', sizes: '512x512' }
    ],
    shortcut: bornAgainLogoUrl,
    apple: [{ url: bornAgainLogoUrl, sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#f97416',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable)} suppressHydrationWarning>
      <body className="font-body antialiased text-left">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          <FontSizeProvider>
            <FirebaseClientProvider>
              {children}
              <Toaster />
              <CookieConsentBanner />
            </FirebaseClientProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
