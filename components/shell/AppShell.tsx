'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI, type View } from '@/components/providers/UIProvider';
import { AgendaScreen } from '@/components/screens/AgendaScreen';
import { CoupleScreen } from '@/components/screens/CoupleScreen';
import { FinanceScreen } from '@/components/screens/FinanceScreen';
import { HealthScreen } from '@/components/screens/HealthScreen';
import { FaithHub } from '@/components/hubs/FaithHub';
import { FocusHub, FocusPill } from '@/components/hubs/FocusHub';
import { ColScreen, LifeHub } from '@/components/hubs/LifeHub';
import { InsightsScreen, MindView, SosOverlay } from '@/components/hubs/MindBody';
import { WeeklyScreen } from '@/components/hubs/Weekly';
import { PageHeader } from '@/components/ui/primitives';
import { AutoNight } from '@/components/providers/AutoNight';
import { Confetti, Onboarding } from '@/components/fx/Intro';
import { DiscreetMode, TextScale } from '@/components/fx/Guard';
import { QuickAdd, Spotlight } from '@/components/fx/Spotlight';
import { WrappedScreen } from '@/components/fx/Wrapped';
import { BibleScreen } from '@/components/screens/BibleScreen';
import { CheckinScreen } from '@/components/screens/CheckinScreen';
import { LocationScreen } from '@/components/screens/LocationScreen';
import { NativeEffects } from '@/components/providers/NativeEffects';
import { SleepOverlay } from '@/components/screens/BodyBits';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { MoreScreen } from '@/components/screens/MoreScreen';
import { NoteEditor } from '@/components/screens/NoteEditor';
import { NotesScreen } from '@/components/screens/NotesScreen';
import { PetScreen } from '@/components/screens/PetScreen';
import { SettingsScreen } from '@/components/screens/SettingsScreen';
import { ShoppingScreen } from '@/components/screens/ShoppingScreen';
import { Sheets } from '@/components/sheets/Sheets';
import { BoxBreathing } from './BoxBreathing';
import { TabBar } from './TabBar';

const SCREENS: Record<View, () => JSX.Element | null> = {
  home: HomeScreen,
  agenda: AgendaScreen,
  notes: NotesScreen,
  health: HealthScreen,
  more: MoreScreen,
  couple: CoupleScreen,
  finance: FinanceScreen,
  shopping: ShoppingScreen,
  pet: PetScreen,
  settings: SettingsScreen,
  location: LocationScreen,
  bible: BibleScreen,
  checkin: CheckinScreen,
  faith: FaithHub,
  focus: FocusHub,
  mind: MindPage,
  life: LifeHub,
  col: ColScreen,
  insights: InsightsScreen,
  weekly: WeeklyScreen,
  wrapped: WrappedScreen,
};

function MindPage() {
  return (
    <div>
      <PageHeader title="Mente" subtitle="Cuidar de dentro" back />
      <MindView />
    </div>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <motion.div className="h-10 w-10 rounded-full border-2 border-black/15 border-t-black dark:border-white/15 dark:border-t-white" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
    </div>
  );
}

export function AppShell() {
  const { status, error } = useAtlas();
  const { view, param } = useUI();
  const TAB_VIEWS = ['home', 'agenda', 'faith', 'health', 'more'];
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') return <Splash />;
  if (status === 'error')
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="glass max-w-sm p-6">
          <p className="text-lg font-semibold">Não deu para carregar seus dados</p>
          <p className="mt-2 text-sm muted">{error}</p>
          <button onClick={() => location.reload()} className="mt-4 h-11 rounded-full bg-black px-6 text-sm font-semibold text-white dark:bg-white dark:text-black">
            Tentar de novo
          </button>
        </div>
      </div>
    );

  const Screen = SCREENS[view];
  return (
    <>
      <main className="mx-auto max-w-2xl px-4 pb-36">
        <motion.div
          key={view + (view === 'col' ? param ?? '' : '')}
          initial={TAB_VIEWS.includes(view) ? { opacity: 0, scale: 0.985 } : { opacity: 0, x: 42, scale: 0.99 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={TAB_VIEWS.includes(view) ? { duration: 0.2, ease: 'easeOut' } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
        >
          <Screen />
        </motion.div>
      </main>
      <TabBar />
      <Sheets />
      <NoteEditor />
      <BoxBreathing />
      <SleepOverlay />
      <SosOverlay />
      <FocusPill />
      <AutoNight />
      <Spotlight />
      <QuickAdd />
      <Confetti />
      <Onboarding />
      <DiscreetMode />
      <TextScale />
      <NativeEffects />
    </>
  );
}
