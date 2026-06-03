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

export const metadata: Metadata = {
  metadataBase: new URL('https://testifyglobal.com'),
  title: {
    default: 'Testify - Global Evangelism & Christian Testimony Platform',
    template: '%s | Testify Global',
  },
  description:
    'Join the global movement to organize the harvest. Share Christian testimonies, join soul-winning campaigns, find accountability partners, and track evangelism progress for the Kingdom of God.',
  keywords: [
    'testify',
    'testify global',
    'christian testimonies',
    'evangelism platform',
    'soul winning',
    'great commission',
    'prayer requests',
    'faith community',
    'spiritual accountability',
    'christian mission campaigns',
    'miracle stories',
    'faith stories',
    'healing testimonies',
    'answers to prayer',
    'praise reports',
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
        
        {/* Favicon / Touch Icon Fallbacks */}
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
                  'A listener indicated an asynchronous response by returning true',
                  'Could not establish connection',
                  'Hydration failed',
                  'Could not reach Cloud Firestore backend'
                ];
                if (e.message && fatalKeywords.some(key => e.message.includes(key))) {
                  // Filter out common browser extension errors that aren't fatal
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
