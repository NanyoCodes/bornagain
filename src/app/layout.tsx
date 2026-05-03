import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import Script from 'next/script';

const logo = PlaceHolderImages.find((img) => img.id === 'logo');
const testifyLogoUrl = logo?.imageUrl || '';
const RAW_ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
// Ensure ID starts with ca-pub- for the script URL
const ADSENSE_CLIENT_ID = RAW_ADSENSE_ID?.startsWith('ca-') ? RAW_ADSENSE_ID : `ca-${RAW_ADSENSE_ID}`;

export const metadata: Metadata = {
  title: 'Testify',
  description:
    'A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.',
  metadataBase: new URL('https://testifyglobal.com'),
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: testifyLogoUrl, type: 'image/png' },
      { url: testifyLogoUrl, sizes: '32x32', type: 'image/png' },
      { url: testifyLogoUrl, sizes: '16x16', type: 'image/png' },
      { url: testifyLogoUrl, sizes: '192x192', type: 'image/png' },
    ],
    shortcut: testifyLogoUrl,
    apple: [
      { url: testifyLogoUrl, sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: testifyLogoUrl,
      },
      {
        rel: 'mask-icon',
        url: testifyLogoUrl,
      }
    ],
  },
  openGraph: {
    title: 'Testify',
    description: 'A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.',
    url: 'https://testifyglobal.com',
    siteName: 'Testify',
    images: [
      {
        url: testifyLogoUrl,
        width: 512,
        height: 512,
        alt: 'Testify Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Testify',
    description: 'A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.',
    images: [testifyLogoUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Source+Code+Pro:wght@400;600&display=swap"
          rel="stylesheet"
        />
        {/* Force Favicon */}
        <link rel="icon" href={testifyLogoUrl} />
        {RAW_ADSENSE_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            {children}
            <Toaster />
            <CookieConsentBanner />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}