import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';
import Script from 'next/script';

const logo = PlaceHolderImages.find((img) => img.id === 'logo');
const testifyLogoUrl = logo?.imageUrl || '';

// AdSense Configuration
const ADSENSE_PUB_ID = 'ca-pub-5186166468494737';

export const metadata: Metadata = {
  title: {
    default: 'Testify - Global Evangelism Platform',
    template: '%s | Testify',
  },
  description:
    'Encourage believers, organize soul-winning campaigns, and track global evangelism progress. Join the movement glorifying God through technology.',
  metadataBase: new URL('https://testifyglobal.com'),
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
        width: 800,
        height: 800,
        alt: 'Testify Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Testify - Global Evangelism Platform',
    description: 'Empowering the Great Commission through technology.',
    images: [testifyLogoUrl],
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="icon" href={testifyLogoUrl} />
        <link rel="apple-touch-icon" href={testifyLogoUrl} />
        
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
