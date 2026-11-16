'use client';

import { useEffect, type ReactNode } from 'react';
import { AtlasIsland } from '@/components/island/AtlasIsland';
import { IslandProvider } from '@/components/island/IslandProvider';
import { AtlasProvider } from './AtlasProvider';
import { ThemeProvider } from './ThemeProvider';
import { UIProvider } from './UIProvider';

function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <UIProvider>
        <IslandProvider>
          <AtlasProvider>
            <PwaRegister />
            <AtlasIsland />
            {children}
          </AtlasProvider>
        </IslandProvider>
      </UIProvider>
    </ThemeProvider>
  );
}
