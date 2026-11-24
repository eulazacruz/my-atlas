'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI, type View } from '@/components/providers/UIProvider';
import { AgendaScreen } from '@/components/screens/AgendaScreen';
import { HealthScreen } from '@/components/screens/HealthScreen';
import { FaithHub } from '@/components/hubs/FaithHub';
import { FocusPill } from '@/components/hubs/FocusHub';

import { MindView, SosOverlay } from '@/components/hubs/MindBody';
import { PageHeader } from '@/components/ui/primitives';
import { AutoNight } from '@/components/providers/AutoNight';
import { Confetti, Onboarding } from '@/components/fx/Intro';
import { DiscreetMode, TextScale } from '@/components/fx/Guard';
import { QuickAdd, Spotlight } from '@/components/fx/Spotlight';
import { NativeEffects } from '@/components/providers/NativeEffects';
import { SleepOverlay } from '@/components/screens/BodyBits';
import { HomeScreen } from '@/components/screens/HomeScreen';
import { MoreScreen } from '@/components/screens/MoreScreen';
import { NoteEditor } from '@/components/screens/NoteEditor';
import { Sheets } from '@/components/sheets/Sheets';
import { BoxBreathing } from './BoxBreathing';
import { TabBar } from './TabBar';
import { AlarmHost } from '@/components/v6/Alarm';
import { DutyHost, DutySync, TaskProofHost } from '@/components/v6/Duty';
import { Setup } from '@/components/fx/Setup';
import { UpdateGate } from '@/components/fx/UpdateGate';
import { InstantWidgetSync } from '@/components/v6/Instants';

import dynamic from 'next/dynamic';
const Loading = () => <div className="grid h-[50vh] place-items-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-30" /></div>;
const CoupleScreen = dynamic(() => import('@/components/screens/CoupleScreen').then((m) => m.CoupleScreen), { ssr: false, loading: Loading });
const FinanceScreen = dynamic(() => import('@/components/screens/FinanceScreen').then((m) => m.FinanceScreen), { ssr: false, loading: Loading });
const WeeklyScreen = dynamic(() => import('@/components/hubs/Weekly').then((m) => m.WeeklyScreen), { ssr: false, loading: Loading });
const WrappedScreen = dynamic(() => import('@/components/fx/Wrapped').then((m) => m.WrappedScreen), { ssr: false, loading: Loading });
const BibleScreen = dynamic(() => import('@/components/screens/BibleScreen').then((m) => m.BibleScreen), { ssr: false, loading: Loading });
const CheckinScreen = dynamic(() => import('@/components/screens/CheckinScreen').then((m) => m.CheckinScreen), { ssr: false, loading: Loading });
const LocationScreen = dynamic(() => import('@/components/screens/LocationScreen').then((m) => m.LocationScreen), { ssr: false, loading: Loading });
const NotesScreen = dynamic(() => import('@/components/screens/NotesScreen').then((m) => m.NotesScreen), { ssr: false, loading: Loading });
const PetScreen = dynamic(() => import('@/components/screens/PetScreen').then((m) => m.PetScreen), { ssr: false, loading: Loading });
const SettingsScreen = dynamic(() => import('@/components/screens/SettingsScreen').then((m) => m.SettingsScreen), { ssr: false, loading: Loading });
const ShoppingScreen = dynamic(() => import('@/components/screens/ShoppingScreen').then((m) => m.ShoppingScreen), { ssr: false, loading: Loading });
const ToolScreen = dynamic(() => import('@/components/v6/ToolScreen').then((m) => m.ToolScreen), { ssr: false, loading: Loading });
const FocusHub = dynamic(() => import('@/components/hubs/FocusHub').then((m) => m.FocusHub), { ssr: false, loading: Loading });
const ColScreen = dynamic(() => import('@/components/hubs/LifeHub').then((m) => m.ColScreen), { ssr: false, loading: Loading });
const LifeHub = dynamic(() => import('@/components/hubs/LifeHub').then((m) => m.LifeHub), { ssr: false, loading: Loading });
const InsightsScreen = dynamic(() => import('@/components/hubs/MindBody').then((m) => m.InsightsScreen), { ssr: false, loading: Loading });

const SCREENS: Record<View, React.ComponentType> = {
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
  tool: ToolScreen,
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
  // Depois que o app abre, carrega as outras telas em segundo plano (navegação instantânea depois)
  useEffect(() => {
    if (status !== 'ready') return;
    const t = window.setTimeout(() => {
      const list = [() => import('@/components/v6/ToolScreen'), () => import('@/components/screens/BibleScreen'), () => import('@/components/screens/CoupleScreen'), () => import('@/components/screens/FinanceScreen'), () => import('@/components/hubs/FocusHub'), () => import('@/components/hubs/LifeHub'), () => import('@/components/v6/Social'), () => import('@/components/v6/MindPlus'), () => import('@/components/v6/FaithPlus')];
      let i = 0;
      const next = () => { if (i < list.length) list[i++]().finally(() => window.setTimeout(next, 120)); };
      next();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [status]);

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
          key={view + (view === 'col' || view === 'tool' ? param ?? '' : '')}
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
      <AlarmHost />
      <DutySync />
      <DutyHost />
      <TaskProofHost />
      <Setup />
      <UpdateGate />
      <InstantWidgetSync />
    </>
  );
}
