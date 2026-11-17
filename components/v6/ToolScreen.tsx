'use client';
import { useUI } from '@/components/providers/UIProvider';
import { PageHeader } from '@/components/ui/primitives';
import { TOOL_META } from '@/lib/tools';
import dynamic from 'next/dynamic';

const L = () => <div className="grid h-[40vh] place-items-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-30" /></div>;
const d = (load: () => Promise<React.ComponentType>) => dynamic(load, { ssr: false, loading: L });

const MAP: Record<string, React.ComponentType> = {
  idiomas: d(() => import('./Lang').then((m) => m.LangTool)),
  social: d(() => import('./Social').then((m) => m.SocialTool)),
  journey: d(() => import('./Journey').then((m) => m.JourneyTool)),
  games: d(() => import('./Games').then((m) => m.GamesTool)),
  wishlist: d(() => import('./LifePlus').then((m) => m.WishlistTool)),
  challenges: d(() => import('./LifePlus').then((m) => m.ChallengesTool)),
  trilha: d(() => import('./LifePlus').then((m) => m.TrilhaTool)),
  piggy: d(() => import('./LifePlus').then((m) => m.PiggyTool)),
  nutrition: d(() => import('./Nutrition').then((m) => m.NutritionTool)),
  alarm: d(() => import('./Alarm').then((m) => m.AlarmTool)),
  tests: d(() => import('./MindPlus').then((m) => m.TestsTool)),
  thoughts: d(() => import('./MindPlus').then((m) => m.ThoughtsTool)),
  worry: d(() => import('./MindPlus').then((m) => m.WorryTool)),
  activate: d(() => import('./MindPlus').then((m) => m.ActivateTool)),
  breaths: d(() => import('./MindPlus').then((m) => m.BreathsTool)),
  mindgames: d(() => import('./MindPlus').then((m) => m.MindGamesTool)),
  safety: d(() => import('./MindPlus').then((m) => m.SafetyTool)),
  care: d(() => import('./MindPlus').then((m) => m.CareTool)),
  psalm: d(() => import('./FaithPlus').then((m) => m.PsalmTool)),
  lectio: d(() => import('./FaithPlus').then((m) => m.LectioTool)),
  acts: d(() => import('./FaithPlus').then((m) => m.ActsTool)),
  examen: d(() => import('./FaithPlus').then((m) => m.ExamenTool)),
  prayertimes: d(() => import('./FaithPlus').then((m) => m.PrayerTimesTool)),
  fruit: d(() => import('./FaithPlus').then((m) => m.FruitTool)),
  gifts: d(() => import('./FaithPlus').then((m) => m.GiftsTool)),
  grace: d(() => import('./FaithPlus').then((m) => m.GraceTool)),
  narrated: d(() => import('./FaithPlus').then((m) => m.NarratedTool)),
  churchday: d(() => import('./FaithPlus').then((m) => m.ChurchDayTool)),
};

export function ToolScreen() {
  const { param } = useUI();
  const id = param ?? '';
  const meta = TOOL_META[id];
  const C = MAP[id];
  if (!meta || !C) return <PageHeader title="Não encontrado" back />;
  return (
    <div>
      <PageHeader title={meta.title} subtitle={meta.hint} back />
      <C />
    </div>
  );
}
