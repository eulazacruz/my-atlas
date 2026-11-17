'use client';
import { useUI } from '@/components/providers/UIProvider';
import { PageHeader } from '@/components/ui/primitives';
import { TOOL_META } from '@/lib/tools';
import { AlarmTool } from './Alarm';
import { ActsTool, ChurchDayTool, ExamenTool, FruitTool, GiftsTool, GraceTool, LectioTool, NarratedTool, PrayerTimesTool, PsalmTool } from './FaithPlus';
import { GamesTool } from './Games';
import { JourneyTool } from './Journey';
import { ChallengesTool, PiggyTool, TrilhaTool, WishlistTool } from './LifePlus';
import { ActivateTool, BreathsTool, CareTool, MindGamesTool, SafetyTool, TestsTool, ThoughtsTool, WorryTool } from './MindPlus';
import { NutritionTool } from './Nutrition';
import { SocialTool } from './Social';

const MAP: Record<string, () => JSX.Element | null> = {
  social: SocialTool, journey: JourneyTool, games: GamesTool, wishlist: WishlistTool, challenges: ChallengesTool, trilha: TrilhaTool, piggy: PiggyTool,
  nutrition: NutritionTool, alarm: AlarmTool,
  tests: TestsTool, thoughts: ThoughtsTool, worry: WorryTool, activate: ActivateTool, breaths: BreathsTool, mindgames: MindGamesTool, safety: SafetyTool, care: CareTool,
  psalm: PsalmTool, lectio: LectioTool, acts: ActsTool, examen: ExamenTool, prayertimes: PrayerTimesTool, fruit: FruitTool, gifts: GiftsTool, grace: GraceTool, narrated: NarratedTool, churchday: ChurchDayTool,
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
