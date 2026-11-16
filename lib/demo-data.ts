import { emptyDB } from './db';
import type { AtlasState, Block, CycleDay, Flow, Mood } from './types';
import { addDays, addMonths, uid, ymd } from './utils';

export const DEMO_A = 'demo-a';
export const DEMO_B = 'demo-b';

const at = (daysFromToday: number, h = 9, m = 0) => {
  const d = addDays(new Date(), daysFromToday);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const day = (n: number) => ymd(addDays(new Date(), n));
const b = (type: Block['type'], text = '', checked?: boolean): Block => ({ id: uid(), type, text, checked });

/** Dados pré-carregados com os dois perfis para visualização imediata. */
export function createDemoData(): AtlasState {
  const db = emptyDB();
  const now = new Date().toISOString();

  db.profiles = [
    { id: DEMO_A, role: 'A', displayName: 'Lázaro', mood: 'em_paz', mentalBattery: 78, updatedAt: at(0, new Date().getHours() - 1) },
    { id: DEMO_B, role: 'B', displayName: 'Vitória', mood: 'radiante', mentalBattery: 86, updatedAt: at(0, new Date().getHours()) },
  ];

  const ma: Mood[] = ['focado', 'cansado', 'em_paz', 'radiante', 'estressado', 'focado', 'em_paz'];
  const mb: Mood[] = ['em_paz', 'radiante', 'cansado', 'focado', 'em_paz', 'radiante', 'radiante'];
  const ba = [62, 48, 70, 88, 35, 74, 78];
  const bb = [70, 84, 52, 66, 72, 90, 86];
  for (let i = 0; i < 7; i++) {
    db.mood_logs.push({ id: uid(), profileId: DEMO_A, mood: ma[i], mentalBattery: ba[i], createdAt: at(i - 6, 10) });
    db.mood_logs.push({ id: uid(), profileId: DEMO_B, mood: mb[i], mentalBattery: bb[i], createdAt: at(i - 6, 11) });
    const n = i - 6;
    db.habit_logs.push({ id: uid(), profileId: DEMO_A, logDate: day(n), devotional: i !== 2, workout: i % 2 === 0, cleanDiet: i !== 4, reading: i % 3 !== 0, waterMl: n === 0 ? 1000 : [2500, 3000, 1500, 3000, 2000, 3500][i] ?? 2000 });
    db.habit_logs.push({ id: uid(), profileId: DEMO_B, logDate: day(n), devotional: true, workout: i % 3 === 0, cleanDiet: i % 2 === 1, reading: true, waterMl: n === 0 ? 1500 : 2500 });
  }

  /* ───── Finanças ───── */
  const dom = new Date().getDate();
  const c = (n: number) => Math.min(n, dom - 1);
  const tx = (d: number, type: 'income' | 'expense', scope: 'shared' | 'individual', amount: number, description: string, category: string, by: string) =>
    db.transactions.push({ id: uid(), type, scope, amount, description, category, createdBy: by, occurredOn: day(-d), createdAt: at(-d, 12) });
  tx(c(14), 'income', 'shared', 4200, 'Salário', 'Renda', DEMO_A);
  tx(c(14), 'income', 'shared', 3100, 'Salário', 'Renda', DEMO_B);
  tx(c(10), 'expense', 'shared', 1350, 'Aluguel / Condomínio', 'Casa', DEMO_A);
  tx(c(9), 'expense', 'shared', 389.9, 'Supermercado do mês', 'Mercado', DEMO_B);
  tx(c(8), 'expense', 'shared', 189.9, 'Energia + internet', 'Contas', DEMO_A);
  tx(c(7), 'expense', 'individual', 129.9, 'Tênis de corrida', 'Saúde', DEMO_A);
  tx(6, 'expense', 'shared', 89.5, 'Pizza de sexta', 'Lazer', DEMO_A);
  tx(5, 'expense', 'shared', 160, 'Ração premium', 'Pet', DEMO_B);
  tx(4, 'expense', 'individual', 54.9, 'Livro', 'Outros', DEMO_B);
  tx(3, 'expense', 'shared', 212.4, 'Feira + hortifruti', 'Mercado', DEMO_A);
  tx(2, 'expense', 'shared', 45, 'Uber para o culto', 'Transporte', DEMO_B);
  tx(1, 'expense', 'shared', 78.3, 'Farmácia', 'Saúde', DEMO_A);
  tx(0, 'expense', 'shared', 32, 'Padaria', 'Mercado', DEMO_B);

  /* ───── Pet ───── */
  db.pets = [{ id: 'demo-pet', name: 'Atlas', breed: 'Vira-lata caramelo', lastBathAt: at(-9), foodRefilledAt: at(-26), foodBagDays: 30 }];
  db.pet_walks = [{ id: uid(), petId: 'demo-pet', walkedBy: DEMO_B, walkedAt: at(0, 7, 10) }];
  const vac = (name: string, monthsAgo: number, interval: number) => {
    const applied = addMonths(new Date(), -monthsAgo);
    return { id: uid(), petId: 'demo-pet', name, appliedOn: ymd(applied), validUntil: ymd(addMonths(applied, interval)), intervalMonths: interval };
  };
  db.pet_vaccines = [vac('V10', 11, 12), vac('Antirrábica', 4, 12), vac('Vermífugo', 4, 3), vac('Antipulgas', 0, 1)];

  /* ───── Ciclo (dela) — 3 ciclos registrados ───── */
  db.cycle_settings = [{ id: DEMO_B, tracking: true, shareWithPartner: true, cycleLength: 28, periodLength: 5 }];
  const flows: Flow[] = ['medium', 'heavy', 'medium', 'light', 'light'];
  const cd: CycleDay[] = [];
  for (const start of [-65, -37, -9]) {
    flows.forEach((f, i) =>
      cd.push({
        id: uid(), profileId: DEMO_B, day: day(start + i), flow: f,
        symptoms: i === 0 ? ['Cólica', 'Cansaço'] : i === 1 ? ['Cólica', 'Dor lombar'] : [],
        moods: i < 2 ? ['Sensível'] : [],
      }),
    );
  }
  cd.push({ id: uid(), profileId: DEMO_B, day: day(-12), flow: 'none', symptoms: ['Seios sensíveis', 'Inchaço'], moods: ['Irritada'], notes: 'TPM chegando' });
  cd.push({ id: uid(), profileId: DEMO_B, day: day(-23), flow: 'none', symptoms: ['Libido alta'], moods: ['Energética'], discharge: 'clara', ovulationTest: 'positive' });
  db.cycle_days = cd;
  db.intimacy_logs = [-1, -4, -8, -15, -22, -24, -30].map((n, i) => ({
    id: uid(), createdBy: i % 2 ? DEMO_B : DEMO_A, happenedAt: at(n, 22), protection: i % 3 === 0 ? 'condom' : 'none',
  }));

  /* ───── Agenda ───── */
  db.events = [
    { id: uid(), createdBy: DEMO_A, owner: null, title: 'Culto de domingo', startsAt: at(((7 - new Date().getDay()) % 7) || 7, 18, 30), endsAt: at(((7 - new Date().getDay()) % 7) || 7, 20, 30), allDay: false, location: 'Igreja' },
    { id: uid(), createdBy: DEMO_B, owner: DEMO_B, title: 'Consulta ginecologista', startsAt: at(2, 14), endsAt: at(2, 15), allDay: false, location: 'Clínica Vida' },
    { id: uid(), createdBy: DEMO_A, owner: null, title: 'Jantar a dois 🍝', startsAt: at(3, 20), allDay: false, location: 'Recife Antigo' },
    { id: uid(), createdBy: DEMO_A, owner: DEMO_A, title: 'Reunião de líderes AeC', startsAt: at(0, 15), endsAt: at(0, 16), allDay: false },
    { id: uid(), createdBy: DEMO_B, owner: null, title: 'Banho e tosa do Atlas', startsAt: at(5, 10), allDay: false },
    { id: uid(), createdBy: DEMO_A, owner: null, title: 'Reunião do condomínio', startsAt: at(8, 19), allDay: false, location: 'Salão de festas' },
  ];

  /* ───── Tarefas ───── */
  const task = (title: string, assignee: string | null, due: number | null, priority = 0, done = false, by = DEMO_A) =>
    db.tasks.push({ id: uid(), createdBy: by, assignee, title, dueDate: due === null ? null : day(due), priority, done, doneAt: done ? now : null, doneBy: done ? assignee ?? by : null, createdAt: now });
  task('Pagar conta de luz', DEMO_A, 0, 2);
  task('Comprar presente da sobrinha', DEMO_B, 2, 1, false, DEMO_B);
  task('Limpar a varanda', null, 1);
  task('Agendar revisão do carro', DEMO_A, 6);
  task('Separar roupas para doação', null, null);
  task('Renovar seguro', DEMO_A, -1, 1, true);

  /* ───── Notas ───── */
  const n1 = uid();
  db.notes = [
    {
      id: n1, createdBy: DEMO_A, parentId: null, title: 'Planejamento 2027', icon: '🎯', isPrivate: false, pinned: true, createdAt: now, updatedAt: at(0, 8),
      blocks: [
        b('h1', 'Nossos objetivos'),
        b('p', 'O que queremos construir juntos no próximo ano.'),
        b('h2', 'Finanças'),
        b('todo', 'Reserva de emergência de 6 meses', false),
        b('todo', 'Quitar o cartão', true),
        b('h2', 'Fé & família'),
        b('bullet', 'Devocional juntos 3x por semana'),
        b('bullet', 'Servir no ministério de casais'),
        b('callout', 'Revisar este plano todo último domingo do mês.'),
      ],
    },
    {
      id: uid(), createdBy: DEMO_B, parentId: n1, title: 'Viagem de aniversário', icon: '✈️', isPrivate: false, pinned: false, createdAt: now, updatedAt: at(-1),
      blocks: [b('h2', 'Opções'), b('number', 'Porto de Galinhas'), b('number', 'Gramado'), b('number', 'Fernando de Noronha'), b('quote', 'Orçamento máximo: R$ 4.000')],
    },
    {
      id: uid(), createdBy: DEMO_B, parentId: null, title: 'Ideias de date', icon: '❤️', isPrivate: false, pinned: false, createdAt: now, updatedAt: at(-2),
      blocks: [b('todo', 'Piquenique no parque', false), b('todo', 'Cozinhar receita nova juntos', true), b('todo', 'Cinema + açaí', false)],
    },
    {
      id: uid(), createdBy: DEMO_A, parentId: null, title: 'Devocional — Salmos', icon: '🙏', isPrivate: false, pinned: false, createdAt: now, updatedAt: at(-3),
      blocks: [b('quote', 'Aquietai-vos, e sabei que eu sou Deus. — Sl 46:10'), b('p', 'Reflexão: descansar não é parar de agir, é confiar enquanto age.')],
    },
  ];

  /* ───── Compras ───── */
  const item = (name: string, category: string, qty: string | null, checked = false, by = DEMO_A) =>
    db.shopping_items.push({ id: uid(), createdBy: by, name, qty, category, checked, checkedBy: checked ? DEMO_B : null, checkedAt: checked ? now : null, createdAt: now });
  item('Arroz', 'Mercado', '5 kg');
  item('Café', 'Mercado', '2 pct', false, DEMO_B);
  item('Banana', 'Hortifruti', '1 dz');
  item('Tomate', 'Hortifruti', '1 kg', true);
  item('Detergente', 'Limpeza', '3');
  item('Ração do Atlas', 'Pet', '15 kg', false, DEMO_B);
  item('Pasta de dente', 'Higiene', '2', true);

  /* ───── Datas especiais ───── */
  db.special_dates = [
    { id: uid(), createdBy: DEMO_A, title: 'Nosso casamento', date: ymd(addDays(addMonths(new Date(), -26), 34)), kind: 'casamento', recurring: true },
    { id: uid(), createdBy: DEMO_A, title: 'Aniversário da Vitória', date: ymd(addDays(new Date(), 19)), kind: 'aniversario', recurring: true },
    { id: uid(), createdBy: DEMO_B, title: 'Aniversário do Lázaro', date: ymd(addDays(new Date(), 140)), kind: 'aniversario', recurring: true },
    { id: uid(), createdBy: DEMO_B, title: 'Viagem para Gramado', date: ymd(addDays(new Date(), 62)), kind: 'viagem', recurring: false },
  ];

  /* ───── Metas ───── */
  db.goals = [
    { id: uid(), createdBy: DEMO_A, title: 'Reserva de emergência', emoji: '🛡️', target: 20000, current: 8600, unit: 'R$', dueDate: day(220) },
    { id: uid(), createdBy: DEMO_B, title: 'Viagem para Gramado', emoji: '✈️', target: 4000, current: 2750, unit: 'R$', dueDate: day(62) },
    { id: uid(), createdBy: DEMO_A, title: 'Ler a Bíblia juntos', emoji: '📖', target: 66, current: 23, unit: 'livros' },
  ];

  /* ───── Oração ───── */
  db.prayers = [
    { id: uid(), createdBy: DEMO_B, title: 'Saúde da mãe da Vitória', details: 'Exames na próxima semana.', answered: false, createdAt: at(-5) },
    { id: uid(), createdBy: DEMO_A, title: 'Sabedoria na liderança do time', answered: false, createdAt: at(-3) },
    { id: uid(), createdBy: DEMO_A, title: 'Aprovação do financiamento', answered: true, answeredAt: at(-10), answerNote: 'Aprovado com taxa menor que o esperado!', createdAt: at(-40) },
  ];

  return {
    couple: { id: 'demo-couple', name: 'Nós Dois', inviteCode: 'ATLAS7', monthlyBudget: 4500, startedAt: db.special_dates[0].date },
    meId: DEMO_A,
    db,
  };
}
