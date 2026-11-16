import { emptyDB } from './db';
import type { AtlasState, Block, CycleDay, Flow, Mood } from './types';
import { addDays, addMonths, uid, ymd } from './utils';

export const DEMO_A = 'demo-a';
export const DEMO_B = 'demo-b';

const ymdLocalD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ymdLocal = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return ymdLocalD(d); };
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

  /* ───── v3 ───── */
  db.profiles[0].contextStatus = 'foco';
  db.profiles[0].contextUpdatedAt = at(0, Math.max(0, new Date().getHours() - 2));
  db.profiles[1].contextStatus = 'casa';
  db.profiles[1].contextUpdatedAt = at(0, Math.max(0, new Date().getHours() - 1));
  db.pet_virtual_state = [{ id: 'demo-vpet', happiness: 82, energy: 70, bonusXp: 40, lastAction: 'pet_petisco', lastActionBy: DEMO_B, lastActionAt: at(0, Math.max(0, new Date().getHours() - 3)), updatedAt: at(0, Math.max(0, new Date().getHours() - 3)) }];
  const hk = ['louca', 'lixo', 'atlas', 'casa', 'compras'];
  for (let i = 0; i < 11; i++) db.household_tasks.push({ id: uid(), createdBy: i % 3 === 0 ? DEMO_B : i % 2 ? DEMO_A : DEMO_B, task: hk[i % 5], doneAt: at(-(i % 6), 19) });
  for (let i = 1; i <= 6; i++) {
    const dur = [412, 385, 445, 360, 470, 398][i - 1];
    const slept = new Date(at(-i, 23, 10));
    db.sleep_logs.push({ id: uid(), profileId: DEMO_A, sleptAt: slept.toISOString(), wokeAt: new Date(slept.getTime() + dur * 60_000).toISOString(), durationMin: dur, confirmed: true });
  }
  db.caffeine_logs = [
    { id: uid(), profileId: DEMO_A, takenAt: at(0, 7, 30), mg: 95, kind: 'Café coado' },
    { id: uid(), profileId: DEMO_A, takenAt: at(0, 13, 10), mg: 65, kind: 'Espresso' },
  ];
  const v = (label: string, value: string, category: string, sort: number, by = DEMO_A) => ({ id: uid(), createdBy: by, label, value, category, sort });
  db.vault_items = [
    v('CPF · Lázaro', '000.000.000-00', 'Documentos', 1),
    v('CPF · Vitória', '111.111.111-11', 'Documentos', 2, DEMO_B),
    v('Pix do casal (e-mail)', 'casal@exemplo.com', 'Pix', 3),
    v('Placa da moto', 'ABC1D23', 'Veículo', 4),
    v('Renavam', '00000000000', 'Veículo', 5),
    v('Wi-Fi de casa', 'senha-exemplo', 'Casa', 6),
    v('Medidas · Lázaro', 'Camisa M · Calça 40 · Tênis 41', 'Medidas', 7),
    v('Medidas · Vitória', 'Blusa P · Calça 36 · Tênis 36', 'Medidas', 8, DEMO_B),
  ];
  db.bible_plan = [{ id: 'demo-plan', plan: 'nt', startDate: ymdLocal(-4) }];
  for (let i = 0; i < 4; i++) {
    db.bible_reads.push({ id: uid(), profileId: DEMO_A, book: 40, chapter: i + 1, readAt: at(-4 + i, 22) });
    db.bible_reads.push({ id: uid(), profileId: DEMO_B, book: 40, chapter: i + 1, readAt: at(-4 + i, 21) });
  }
  db.bible_reads.push({ id: uid(), profileId: DEMO_B, book: 40, chapter: 5, readAt: at(0, 7) });
  db.bible_marks = [
    { id: uid(), createdBy: DEMO_A, book: 40, chapter: 5, verse: 9, color: 'gold', note: 'Ser pacificador começa em casa.' },
    { id: uid(), createdBy: DEMO_B, book: 40, chapter: 5, verse: 14, color: 'blue', note: null },
    { id: uid(), createdBy: DEMO_B, book: 19, chapter: 23, verse: 1, color: 'green', note: null },
  ];
  const lastSunday = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() - 7); return ymdLocalD(d); })();
  db.checkins = [
    { id: uid(), profileId: DEMO_A, week: lastSunday, score: 4, answers: { bom: 'O culto de domingo e o jantar juntos.', pesou: 'Semana corrida na AeC.', preciso: 'Mais tempo sem celular à noite.', gratidao: 'Pela paciência dela.' } },
    { id: uid(), profileId: DEMO_B, week: lastSunday, score: 5, answers: { bom: 'Passeio com o Atlas na praia.', pesou: 'Cansaço.', preciso: 'Ajuda com a louça.', gratidao: 'Pelo carinho dele.' } },
  ];
  const E = (kind: string, title: string, o: Partial<{ body: string; date: string | null; done: boolean; private: boolean; data: Record<string, unknown>; by: string }> = {}) =>
    db.entries.push({ id: uid(), createdBy: o.by ?? DEMO_A, kind, title, body: o.body ?? null, date: o.date ?? null, done: o.done ?? false, private: o.private ?? false, data: o.data ?? {}, sort: Date.now() + db.entries.length, createdAt: new Date(Date.now() - db.entries.length * 3600_000).toISOString() });
  const today = ymdLocal(0);
  E('priority', 'Fechar relatório de indicadores da AeC', { date: today, done: true });
  E('priority', 'Gravar 2 Reels de liderança', { date: today });
  E('priority', 'Orar com a Vitória antes de dormir', { date: today });
  E('priority', 'Consulta às 14h', { date: today, by: DEMO_B, done: true });
  E('priority', 'Separar roupas da semana', { date: today, by: DEMO_B });
  E('focus', 'Relatório', { date: today, data: { minutes: 50 } });
  E('idea', 'Série de Reels: liderança no dia a dia', { data: { tag: 'Conteúdo' }, body: '5 episódios curtos' });
  E('idea', 'Horta vertical na varanda', { data: { tag: 'Casa' }, by: DEMO_B });
  E('book', 'Liderança com propósito', { data: { author: 'Autor exemplo', status: 'Lendo', pages: 240, page: 96, rating: 4 } });
  E('goal', 'Ler 12 livros', { date: `${new Date().getFullYear()}-12-31`, data: { area: 'Pessoal', target: 12, current: 9, unit: 'livros' } });
  E('project', 'Organizar o quarto de visitas', { data: { owner: 'Nós dois', steps: [{ t: 'Doar roupas', done: true }, { t: 'Pintar parede', done: false }, { t: 'Comprar cortina', done: false }] } });
  E('habit', 'Inglês 20 min', { data: { emoji: '🇺🇸', days: { [ymdLocal(0)]: true, [ymdLocal(-1)]: true, [ymdLocal(-2)]: true, [ymdLocal(-4)]: true } } });
  E('devotional', 'Bem-aventurados os pacificadores', { date: today, by: DEMO_B, data: { ref: 'Mateus 5', s: 'Bem-aventurados os pacificadores, porque eles serão chamados filhos de Deus.', o: 'Paz é algo que se constrói, não só se espera.', a: 'Responder com calma quando estiver cansada.', p: 'Senhor, faz de mim um instrumento da tua paz em casa.' } });
  E('memory', 'Filipenses 4:6', { body: 'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica, com ações de graças.', data: { ref: 'Filipenses 4:6', box: 1, next: today } });
  E('church', 'Culto de celebração', { date: ymdLocal((7 - new Date().getDay()) % 7 || 7), data: { time: '18:00', type: 'Culto', who: 'Nós dois', place: 'Igreja' } });
  E('person', 'Pr. Marcos', { data: { relation: 'Igreja', every: 14, last: ymdLocal(-20), pray: 'Saúde da família' } });
  E('person', 'Mãe da Vitória', { data: { relation: 'Família', every: 7, last: ymdLocal(-9) }, by: DEMO_B });
  E('emotion', 'Gratidão', { date: today, private: true, data: { level: 4, cause: 'Semana produtiva', helped: 'Oração da manhã' } });
  E('win', 'Bati a meta do mês na equipe', { date: ymdLocal(-2) });
  E('limit', 'Sem celular depois das 22h', { data: { days: { [ymdLocal(-1)]: true, [ymdLocal(-2)]: true } } });
  E('workout', 'Musculação', { date: ymdLocal(-1), data: { minutes: 60, feel: 4 }, body: 'Peito e tríceps' });
  E('workout', 'Corrida', { date: ymdLocal(-3), data: { minutes: 30, feel: 5 } });
  [82.4, 81.9, 81.6, 81.2].forEach((w, i) => E('measure', '', { date: ymdLocal(-21 + i * 7), private: true, data: { weight: w } }));
  E('watch', 'A Escolha', { data: { type: 'Filme', where: 'Netflix', status: 'Quero ver' } });
  E('watch', 'The Chosen', { data: { type: 'Série', where: 'Prime', status: 'Vendo', rating: 5 } });
  E('place', 'Restaurante do Recife Antigo', { data: { type: 'Restaurante', rating: 5, again: true } });
  E('recipe', 'Escondidinho de charque', { data: { minutes: 50, ingredients: ['Macaxeira', 'Charque', 'Queijo coalho', 'Cebola'] } });
  E('document', 'Garantia da geladeira', { date: ymdLocal(25), data: { type: 'Garantia' } });
  E('capsule', 'Para o nosso aniversário de casamento', { date: ymdLocal(120), by: DEMO_B, body: 'Abre só no dia 🤍' });
  E('setting', 'couple_night', { data: { day: 5, time: '20:00' } });
  db.locations = [
    { id: DEMO_A, sharing: true, lat: -8.0476, lng: -34.877, accuracy: 18, speed: 0, battery: 64, updatedAt: at(0, new Date().getHours(), Math.max(0, new Date().getMinutes() - 4)) },
    { id: DEMO_B, sharing: true, lat: -7.9007, lng: -34.8984, accuracy: 12, speed: 0, battery: 81, updatedAt: at(0, new Date().getHours(), Math.max(0, new Date().getMinutes() - 1)) },
  ];

  return {
    couple: { id: 'demo-couple', name: 'Nós Dois', inviteCode: 'ATLAS7', monthlyBudget: 4500, startedAt: db.special_dates[0].date },
    meId: DEMO_A,
    db,
  };
}
