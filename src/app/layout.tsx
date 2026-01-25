import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';
import '@/styles/onboarding-tour.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: {
    default: 'Nowly - Manage When You Do',
    template: '%s | Nowly',
  },
  description: "Manage when you do, not just when it's due.",
  metadataBase: new URL('https://nowly-v2.vercel.app'),
  manifest: '/manifest.json',

  // Open Graph for social sharing (Slack, Discord, iMessage, etc.)
  openGraph: {
    title: 'Nowly - Manage When You Do',
    description: "Manage when you do, not just when it's due.",
    url: 'https://nowly-v2.vercel.app',
    siteName: 'Nowly',
    images: [
      {
        url: '/og-image.jpg', // You'll create this (1200x630px)
        width: 1200,
        height: 630,
        alt: "Nowly - Manage when you do, not just when it's due",
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  // Twitter/X specific cards
  twitter: {
    card: 'summary_large_image',
    title: 'Nowly - Manage When You Do',
    description: "Manage when you do, not just when it's due.",
    images: ['/og-image.jpg'],
  },

  // App icons for browser tabs, bookmarks, etc.
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  verification: {
    google: 'EtaQsAPiJREYVc_JvC4M3jhaCXP1z2TJT_kozTZWah8',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
