import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import { FontSizeProvider } from '@/components/font-size-provider';
import Script from 'next/script';

const logo = PlaceHolderImages.find((img) => img.id === 'logo');
const testifyLogoUrl = logo?.imageUrl || '';

// AdSense Configuration
const ADSENSE_PUB_ID = 'ca-pub-5186166468494737';

export const metadata: Metadata = {
  metadataBase: new URL('https://testifyglobal.com'),
  title: {
    default: 'Testify - Global Evangelism & Christian Testimony Platform',
    template: '%s | Testify Global',
  },
  description:
    'Join the global movement to organize the harvest. Share Christian testimonies, join soul-winning campaigns, find accountability partners, and track evangelism progress for the Kingdom of God.',
  keywords: [
    'christian testimonies',
    'evangelism platform',
    'soul winning',
    'great commission',
    'prayer requests',
    'faith community',
    'spiritual accountability',
    'christian mission campaigns',
  ],
  authors: [{ name: 'Testify Global Team' }],
  creator: 'Testify Global',
  publisher: 'Testify Global',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Testify - Global Evangelism Platform',
    description: 'Share your story, join the harvest, and connect with the global Body of Christ.',
    url: 'https://testifyglobal.com',
    siteName: 'Testify Global',
    images: [
      {
        url: testifyLogoUrl,
        width: 1200,
        height: 630,
        alt: 'Testify Global - Share Your Testimony and Join the Harvest',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Testify - Global Evangelism Platform',
    description: 'Empowering the Great Commission through technology. Share testimonies and track souls won.',
    images: [testifyLogoUrl],
    creator: '@testifyglobal',
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
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: testifyLogoUrl, type: 'image/png' }],
    shortcut: testifyLogoUrl,
    apple: [{ url: testifyLogoUrl, sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#f97416',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Testify Global',
    'url': 'https://testifyglobal.com',
    'logo': testifyLogoUrl,
    'description':
      'A global platform for Christian testimonies, evangelism campaigns, and tracking spiritual progress.',
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': '+234-814-853-8502',
      'contactType': 'customer service',
      'email': 'testifyglobal360@gmail.com',
    },
    'sameAs': [
      'https://www.facebook.com/testifyglobal',
      'https://twitter.com/testifyglobal',
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="icon" href={testifyLogoUrl} />
        <link rel="apple-touch-icon" href={testifyLogoUrl} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Global Google AdSense Script (Auto Ads) */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', (e) => {
                if (e.message && (
                  e.message.includes('A listener indicated an asynchronous response by returning true') ||
                  e.message.includes('Could not establish connection. Receiving end does not exist')
                )) {
                  e.stopImmediatePropagation();
                }
              }, true);
            `,
          }}
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
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
