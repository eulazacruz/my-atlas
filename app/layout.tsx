import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers/Providers';
import '@fontsource-variable/inter';
import '@fontsource-variable/literata';
import './globals.css';

export const metadata: Metadata = {
  title: 'My Atlas',
  description: 'Life & Couple OS — produtividade, fé, saúde mental, finanças e pet care do casal.',
  manifest: '/manifest.json',
  applicationName: 'My Atlas',
  appleWebApp: { capable: true, title: 'My Atlas', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#F2F2F4' },
  ],
};

const NATIVE_RETURN = `(function(){try{var s=location.search;if(location.pathname.indexOf('/voltar')===0)return;var p=new URLSearchParams(s);if(!p.get('code')&&!p.get('error_description'))return;if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())return;var mine=false;try{mine=!!localStorage.getItem('my-atlas-auth-code-verifier')}catch(e){}if(p.get('app')==='1'||!mine){location.replace('/voltar/'+s);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NATIVE_RETURN }} />
      </head>
      <body className="min-h-dvh font-sans">
        <div className="ambient" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
