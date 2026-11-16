/* Tipos espelham as colunas do Supabase em camelCase (mapeamento automático em lib/db.ts). */
export type Role = 'A' | 'B';
export type Mood = 'radiante' | 'focado' | 'em_paz' | 'cansado' | 'estressado';

export interface Couple {
  id: string;
  name: string;
  inviteCode: string;
  monthlyBudget: number;
  startedAt: string | null;
}

export interface Profile {
  id: string;
  coupleId?: string;
  role: Role;
  displayName: string;
  avatarUrl?: string | null;
  mood: Mood;
  mentalBattery: number;
  updatedAt: string;
  contextStatus?: string | null;
  contextUpdatedAt?: string | null;
  pending?: boolean;
}

export interface MoodLog { id: string; profileId: string; mood: Mood; mentalBattery: number; createdAt: string }

export type HabitKey = 'devotional' | 'workout' | 'cleanDiet' | 'reading';
export interface HabitLog {
  id: string;
  profileId: string;
  logDate: string;
  devotional: boolean;
  workout: boolean;
  cleanDiet: boolean;
  reading: boolean;
  waterMl: number;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  createdBy: string;
  type: 'income' | 'expense';
  scope: 'shared' | 'individual';
  amount: number;
  description: string;
  category: string;
  occurredOn: string;
  createdAt: string;
}

export interface Pet {
  id: string;
  name: string;
  breed?: string | null;
  lastBathAt: string | null;
  foodRefilledAt: string | null;
  foodBagDays: number;
}
export interface PetWalk { id: string; petId: string; walkedBy: string; walkedAt: string }
export interface Vaccine { id: string; petId: string; name: string; appliedOn: string | null; validUntil: string | null; intervalMonths: number }

export type Flow = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
export interface CycleSettings {
  id: string; // = profile id da dona do ciclo
  tracking: boolean;
  shareWithPartner: boolean;
  cycleLength: number;
  periodLength: number;
  updatedAt?: string;
}
export interface CycleDay {
  id: string;
  profileId: string;
  day: string;
  flow: Flow;
  symptoms: string[];
  moods: string[];
  discharge?: string | null;
  temperature?: number | null;
  ovulationTest?: 'positive' | 'negative' | null;
  pregnancyTest?: 'positive' | 'negative' | null;
  notes?: string | null;
  updatedAt?: string;
}
export interface IntimacyLog { id: string; createdBy: string; happenedAt: string; protection: string; notes?: string | null }

export interface CalEvent {
  id: string;
  createdBy: string;
  owner: string | null;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  location?: string | null;
  notes?: string | null;
}

export interface Task {
  id: string;
  createdBy: string;
  assignee: string | null;
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  priority: number;
  done: boolean;
  doneAt?: string | null;
  doneBy?: string | null;
  createdAt: string;
}

export type BlockType = 'p' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'number' | 'quote' | 'callout' | 'divider';
export interface Block { id: string; type: BlockType; text: string; checked?: boolean }
export interface Note {
  id: string;
  createdBy: string;
  parentId: string | null;
  title: string;
  icon?: string | null;
  blocks: Block[];
  isPrivate: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  createdBy: string;
  name: string;
  qty?: string | null;
  category: string;
  checked: boolean;
  checkedBy?: string | null;
  checkedAt?: string | null;
  createdAt: string;
}

export interface SpecialDate { id: string; createdBy: string; title: string; date: string; kind: string; recurring: boolean }
export interface Goal { id: string; createdBy: string; title: string; emoji?: string | null; target: number; current: number; unit: string; dueDate?: string | null }
export interface Prayer {
  id: string;
  createdBy: string;
  title: string;
  details?: string | null;
  answered: boolean;
  answeredAt?: string | null;
  answerNote?: string | null;
  createdAt: string;
}

export interface HouseholdLog { id: string; createdBy: string; task: string; doneAt: string }
export interface PetVirtual {
  id: string;
  happiness: number;
  energy: number;
  bonusXp: number;
  lastAction?: string | null;
  lastActionBy?: string | null;
  lastActionAt?: string | null;
  updatedAt: string;
}
export interface SleepLog { id: string; profileId: string; sleptAt: string; wokeAt?: string | null; durationMin?: number | null; confirmed: boolean }
export interface CaffeineLog { id: string; profileId: string; takenAt: string; mg: number; kind: string }
export interface VaultItem { id: string; createdBy: string; label: string; value: string; category: string; sort: number; createdAt?: string }
export interface LocationRow { id: string; sharing: boolean; lat?: number | null; lng?: number | null; accuracy?: number | null; speed?: number | null; battery?: number | null; updatedAt: string }

export interface BibleMark { id: string; createdBy: string; book: number; chapter: number; verse: number; color: string; note?: string | null; createdAt?: string }
export interface BibleRead { id: string; profileId: string; book: number; chapter: number; readAt: string }
export interface BiblePlan { id: string; plan: string; startDate: string; createdAt?: string }
export interface Checkin { id: string; profileId: string; week: string; score: number | null; answers: Record<string, string>; createdAt?: string }
export interface ExternalEvent { id: string; title: string; start: string; end: string | null; allDay: boolean; location: string | null; owner: string }

export interface Tables {
  profiles: Profile;
  mood_logs: MoodLog;
  habit_logs: HabitLog;
  transactions: Transaction;
  pets: Pet;
  pet_walks: PetWalk;
  pet_vaccines: Vaccine;
  cycle_settings: CycleSettings;
  cycle_days: CycleDay;
  intimacy_logs: IntimacyLog;
  events: CalEvent;
  tasks: Task;
  notes: Note;
  shopping_items: ShoppingItem;
  special_dates: SpecialDate;
  goals: Goal;
  prayers: Prayer;
  household_tasks: HouseholdLog;
  pet_virtual_state: PetVirtual;
  sleep_logs: SleepLog;
  caffeine_logs: CaffeineLog;
  vault_items: VaultItem;
  bible_marks: BibleMark;
  bible_reads: BibleRead;
  bible_plan: BiblePlan;
  checkins: Checkin;
  locations: LocationRow;
}
export type TableName = keyof Tables;
export type DB = { [K in TableName]: Tables[K][] };

export interface AtlasState {
  couple: Couple;
  meId: string;
  db: DB;
}

export type IslandKind = 'mood' | 'expense' | 'water' | 'breathing' | 'nudge' | 'pet' | 'sync' | 'success' | 'agenda' | 'task' | 'cycle' | 'shopping' | 'prayer' | 'status' | 'need' | 'sleep' | 'caffeine' | 'vault' | 'location' | 'bible' | 'checkin';
export interface IslandAction { label: string; onClick?: () => void; primary?: boolean }
export interface IslandEvent {
  id: string;
  kind: IslandKind;
  title: string;
  subtitle?: string;
  avatar?: { name: string; url?: string | null };
  actions?: IslandAction[];
  duration?: number;
}
export type SyncState = 'demo' | 'syncing' | 'synced' | 'offline';
