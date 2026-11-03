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

const testifyLogoUrl = 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3';

export const metadata: Metadata = {
  metadataBase: new URL('https://testifyglobal.com'),
  title: {
    default: 'Born Again | Global Christian Testimony & Evangelism Platform',
    template: '%s | Born Again',
  },
  description:
    'Born Again is the global platform for believers to share the greatness of GOD in their lives, join soul-winning campaigns, and track the harvest. Join Born Again today.',
  keywords: [
    'Born Again',
    'Born Again Global',
    'Born Again App',
    'Christian Testimonies',
    'Miracle Stories',
    'Soul Winning',
    'Great Commission',
    'Evangelism Tool',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Born Again',
  },
  authors: [{ name: 'Born Again Team' }],
  creator: 'Born Again',
  publisher: 'Born Again',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Born Again - Share Your Story, Join the Harvest',
    description: 'Born Again is empowering the Great Commission through technology. Share testimonies and track souls won globally.',
    url: 'https://testifyglobal.com',
    siteName: 'Born Again',
    images: [
      {
        url: testifyLogoUrl,
        width: 1200,
        height: 630,
        alt: 'Born Again - Christian Testimony Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Born Again | Global Evangelism Platform',
    description: 'The premier platform for Christian miracle stories and soul-winning campaigns.',
    images: [testifyLogoUrl],
    creator: '@bornagainglobal',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: testifyLogoUrl, type: 'image/png', sizes: '192x192' },
      { url: testifyLogoUrl, type: 'image/png', sizes: '512x512' }
    ],
    shortcut: testifyLogoUrl,
    apple: [{ url: testifyLogoUrl, sizes: '180x180', type: 'image/png' }],
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
      <body className="font-body antialiased">
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
