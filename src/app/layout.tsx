import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';

const logo = PlaceHolderImages.find((img) => img.id === 'logo');
const testifyLogoUrl = logo?.imageUrl || '';

export const metadata: Metadata = {
  title: 'Testify',
  description:
    'A platform for believers to share testimonies, organize soul-winning campaigns, and track evangelism progress.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: testifyLogoUrl,
    shortcut: testifyLogoUrl,
    apple: testifyLogoUrl,
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: testifyLogoUrl,
      },
    ],
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
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
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
