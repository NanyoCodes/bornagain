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
const ADSENSE_CLIENT_ID = RAW_ADSENSE_ID?.startsWith('ca-') ? RAW_ADSENSE_ID : `ca-${RAW_ADSENSE_ID}`;

export const metadata: Metadata = {
  title: 'Testify',
  description:
    'A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.',
  metadataBase: new URL('https://testifyglobal.com'),
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: testifyLogoUrl, type: 'image/png' }],
    shortcut: testifyLogoUrl,
    apple: [{ url: testifyLogoUrl, sizes: '180x180', type: 'image/png' }],
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        {/* Force Favicon for various devices */}
        <link rel="icon" href={testifyLogoUrl} />
        <link rel="apple-touch-icon" href={testifyLogoUrl} />
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
