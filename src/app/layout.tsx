import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './globals.css';
import { Toaster } from 'sonner';
import { BRAND, SITE_URL } from '@/lib/brand';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  alternates: { canonical: '/' },
  keywords: ['drawing game', 'pictionary', 'multiplayer', 'online game', 'draw and guess', 'party game'],
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    type: 'website',
    siteName: BRAND.name,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#070910',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          closeButton
          toastOptions={{
            style: {
              background: '#151b2c',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#eef1f8',
            },
          }}
        />
      </body>
    </html>
  );
}
