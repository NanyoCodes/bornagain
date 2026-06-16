import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import { FontSizeProvider } from '@/components/font-size-provider';
import Script from 'next/script';

const testifyLogoUrl = 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3';

export const metadata: Metadata = {
  metadataBase: new URL('https://testifyglobal.com'),
  title: {
    default: 'Testify | Global Christian Testimony & Evangelism Platform',
    template: '%s | Testify Global',
  },
  description:
    'Testify is the global platform for believers to share miracle stories, join soul-winning campaigns, and track the harvest. Join Testify Global today.',
  keywords: [
    'Testify',
    'Testify Global',
    'Testify App',
    'Testify Platform',
    'Christian Testimonies',
    'Miracle Stories',
    'Soul Winning',
    'Great Commission',
    'Evangelism Tool',
    'Faith Journal',
    'Spiritual Accountability',
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
    title: 'Testify - Share Your Story, Join the Harvest',
    description: 'Testify is empowering the Great Commission through technology. Share testimonies and track souls won globally.',
    url: 'https://testifyglobal.com',
    siteName: 'Testify Global',
    images: [
      {
        url: testifyLogoUrl,
        width: 1200,
        height: 630,
        alt: 'Testify Global - Christian Testimony Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Testify | Global Evangelism Platform',
    description: 'The premier platform for Christian miracle stories and soul-winning campaigns.',
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Testify Global',
    'url': 'https://testifyglobal.com',
    'logo': testifyLogoUrl,
    'description':
      'Testify is a global platform for Christian testimonies, evangelism campaigns, and tracking spiritual progress.',
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
        
        {/* Favicon / Touch Icon Fallbacks - Force absolute logo URL to override local caches */}
        <link rel="icon" href={testifyLogoUrl} />
        <link rel="apple-touch-icon" href={testifyLogoUrl} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', (e) => {
                const fatalKeywords = [
                  'Could not establish connection',
                  'Could not reach Cloud Firestore backend'
                ];
                if (e.message && fatalKeywords.some(key => e.message.includes(key))) {
                  // Ignore common browser extension noise
                  if (e.message.includes('A listener indicated')) return;

                  const reloadCountKey = 'app_reload_count';
                  const lastReloadKey = 'app_last_reload';
                  const now = Date.now();
                  const lastReload = parseInt(localStorage.getItem(lastReloadKey) || '0', 10);
                  const reloadCount = parseInt(localStorage.getItem(reloadCountKey) || '0', 10);

                  if (now - lastReload < 30000 && reloadCount >= 2) {
                    console.error('Persistent fatal error detected. Stopping auto-refresh.');
                    return;
                  }

                  localStorage.setItem(lastReloadKey, now.toString());
                  localStorage.setItem(reloadCountKey, (now - lastReload > 30000 ? 1 : reloadCount + 1).toString());
                  
                  window.location.reload();
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
