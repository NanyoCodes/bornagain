import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import { FontSizeProvider } from '@/components/font-size-provider';
import { SearchProvider } from '@/context/search-context';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import Script from 'next/script';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const bornAgainLogoUrl = 'https://i.postimg.cc/K8VD8BYD/Born-Again-Mountain-Sunrise-Emblem.png';

export const metadata: Metadata = {
  metadataBase: new URL('https://bornagainglobal.com'),
  title: {
    default: 'BornAgain Global | Christian Identity & Evangelism Platform',
    template: '%s | BornAgain Global',
  },
  description:
    'BornAgain Global is the premier platform for the new creation in Christ. Share testimonies, win souls, and lead mission campaigns for the Kingdom of God. Discover the true meaning of being born again.',
  keywords: [
    'BornAgain',
    'Born Again',
    'What does born again mean',
    'BornAgain Global',
    'BornAgain App',
    'Christian Testimonies',
    'New Creation in Christ',
    'Soul Winning Tools',
    'Great Commission App',
    'Evangelism Strategy',
    'Christian Accountability Partner',
    'Faith Based Technology',
  ],
  authors: [{ name: 'BornAgain Global Team' }],
  creator: 'BornAgain Global',
  publisher: 'BornAgain Global',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://bornagainglobal.com',
  },
  openGraph: {
    title: 'BornAgain Global - Are you BornAgain?',
    description: 'The global platform for the redeemed. Proclaim God’s goodness and mobilize the harvest as a new creation in Christ.',
    url: 'https://bornagainglobal.com',
    siteName: 'BornAgain Global',
    images: [
      {
        url: bornAgainLogoUrl,
        width: 1200,
        height: 630,
        alt: 'BornAgain Global - Christian Identity Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BornAgain Global | Global Evangelism Platform',
    description: 'Empowering the Body of Christ through technology. Share your miracles and track the harvest.',
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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BornAgain Global',
    url: 'https://bornagainglobal.com',
    logo: bornAgainLogoUrl,
    description: 'BornAgain Global is the global platform for the new creation in Christ, dedicated to sharing testimonies and mobilizing the harvest.',
    sameAs: [
      'https://twitter.com/bornagainglobal',
      'https://facebook.com/bornagainglobal',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'testifyglobal360@gmail.com',
      contactType: 'customer support'
    }
  };

  return (
    <html lang="en" className={cn(inter.variable)} suppressHydrationWarning>
      <body className="font-body antialiased">
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          <FontSizeProvider>
            <SearchProvider>
              <FirebaseClientProvider>
                {children}
                <Toaster />
                <CookieConsentBanner />
              </FirebaseClientProvider>
            </SearchProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
