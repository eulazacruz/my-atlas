import type { BlockType, Flow, HabitKey, Mood } from './types';

export const MOODS: Record<Mood, { label: string; emoji: string; score: number }> = {
  radiante: { label: 'Radiante', emoji: '☀️', score: 95 },
  focado: { label: 'Focado', emoji: '🎯', score: 80 },
  em_paz: { label: 'Em paz', emoji: '🕊️', score: 75 },
  cansado: { label: 'Cansado', emoji: '🥱', score: 40 },
  estressado: { label: 'Estressado', emoji: '🌪️', score: 25 },
};
export const MOOD_ORDER: Mood[] = ['radiante', 'focado', 'em_paz', 'cansado', 'estressado'];

/** Cores de destaque usadas com parcimônia. Todo o resto é preto, branco e cinza. */
export const ACCENT = {
  cycle: '#f472b6',
  fertile: '#a78bfa',
  positive: '#34d399',
  negative: '#f87171',
  warn: '#fbbf24',
  water: '#7dd3fc',
};

export const HABITS: { key: HabitKey; label: string; emoji: string }[] = [
  { key: 'devotional', label: 'Devocional', emoji: '🙏' },
  { key: 'workout', label: 'Treino', emoji: '🏃' },
  { key: 'cleanDiet', label: 'Dieta limpa', emoji: '🥗' },
  { key: 'reading', label: 'Leitura', emoji: '📖' },
];
export const WATER_GOAL = 3000;
export const WATER_STEP = 500;

export const TX_CATEGORIES = ['Mercado', 'Casa', 'Contas', 'Lazer', 'Pet', 'Transporte', 'Saúde', 'Igreja', 'Outros'];
export const SHOP_CATEGORIES = ['Mercado', 'Hortifruti', 'Limpeza', 'Higiene', 'Farmácia', 'Pet', 'Casa', 'Outros'];

/* ───────── Ciclo ───────── */
export const FLOWS: { value: Flow; label: string; dots: number }[] = [
  { value: 'none', label: 'Sem fluxo', dots: 0 },
  { value: 'spotting', label: 'Escape', dots: 1 },
  { value: 'light', label: 'Leve', dots: 1 },
  { value: 'medium', label: 'Médio', dots: 2 },
  { value: 'heavy', label: 'Intenso', dots: 3 },
];
export const SYMPTOMS = [
  'Cólica', 'Dor de cabeça', 'Inchaço', 'Seios sensíveis', 'Acne', 'Cansaço', 'Náusea',
  'Dor lombar', 'Insônia', 'Desejo por doce', 'Libido alta', 'Libido baixa', 'Diarreia', 'Prisão de ventre',
];
export const CYCLE_MOODS = ['Feliz', 'Sensível', 'Irritada', 'Ansiosa', 'Triste', 'Calma', 'Energética', 'Carente'];
export const DISCHARGE = [
  { value: 'seco', label: 'Seco' },
  { value: 'pegajoso', label: 'Pegajoso' },
  { value: 'cremoso', label: 'Cremoso' },
  { value: 'clara', label: 'Clara de ovo' },
  { value: 'aguado', label: 'Aguado' },
];
export const PROTECTION = [
  { value: 'none', label: 'Sem proteção' },
  { value: 'condom', label: 'Camisinha' },
  { value: 'pill', label: 'Pílula' },
  { value: 'iud', label: 'DIU' },
  { value: 'withdrawal', label: 'Coito interrompido' },
  { value: 'other', label: 'Outro' },
];
export const PHASES = {
  menstrual: { label: 'Menstruação', tip: 'Descanso, calor e hidratação. Pegue leve nos treinos.' },
  folicular: { label: 'Fase folicular', tip: 'Energia subindo: bom momento para começar coisas novas.' },
  fertil: { label: 'Janela fértil', tip: 'Maior chance de gravidez nestes dias.' },
  ovulacao: { label: 'Ovulação prevista', tip: 'Pico de fertilidade e de energia.' },
  lutea: { label: 'Fase lútea', tip: 'TPM pode aparecer: paciência, carinho e menos cafeína.' },
} as const;
export type PhaseKey = keyof typeof PHASES;

/* ───────── Datas especiais ───────── */
export const DATE_KINDS = [
  { value: 'casamento', label: 'Casamento', emoji: '💍' },
  { value: 'namoro', label: 'Namoro', emoji: '❤️' },
  { value: 'aniversario', label: 'Aniversário', emoji: '🎂' },
  { value: 'viagem', label: 'Viagem', emoji: '✈️' },
  { value: 'outro', label: 'Outro', emoji: '⭐' },
];

/* ───────── Notas ───────── */
export const BLOCK_TYPES: { type: BlockType; label: string; hint: string; md?: string }[] = [
  { type: 'p', label: 'Texto', hint: 'Parágrafo simples' },
  { type: 'h1', label: 'Título 1', hint: 'Seção grande', md: '#' },
  { type: 'h2', label: 'Título 2', hint: 'Seção média', md: '##' },
  { type: 'h3', label: 'Título 3', hint: 'Seção pequena', md: '###' },
  { type: 'todo', label: 'Lista de tarefas', hint: 'Caixas de seleção', md: '[]' },
  { type: 'bullet', label: 'Lista', hint: 'Marcadores', md: '-' },
  { type: 'number', label: 'Lista numerada', hint: '1. 2. 3.', md: '1.' },
  { type: 'quote', label: 'Citação', hint: 'Destaque com barra', md: '>' },
  { type: 'callout', label: 'Destaque', hint: 'Caixa com ícone', md: '!' },
  { type: 'divider', label: 'Divisor', hint: 'Linha separadora', md: '---' },
];
export const NOTE_ICONS = ['📝', '📌', '💡', '🙏', '📖', '🎯', '💰', '🏠', '✈️', '❤️', '🛒', '🍽️', '📅', '🐶', '🧠', '⭐'];

export const PRIORITY = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Importante' },
  { value: 2, label: 'Urgente' },
];

/** Versículos (Almeida, domínio público) + reflexões estoicas (tradução livre). */
export const DAILY_WORDS: { text: string; ref: string; kind: 'Versículo' | 'Estoico' }[] = [
  { text: 'Tudo posso naquele que me fortalece.', ref: 'Filipenses 4:13', kind: 'Versículo' },
  { text: 'Não é a coisa que te perturba, mas o juízo que fazes dela.', ref: 'Epicteto', kind: 'Estoico' },
  { text: 'Lança o teu cuidado sobre o Senhor, e ele te susterá.', ref: 'Salmos 55:22', kind: 'Versículo' },
  { text: 'Você tem poder sobre sua mente, não sobre os eventos. Perceba isso e encontrará força.', ref: 'Marco Aurélio', kind: 'Estoico' },
  { text: 'O amor é sofredor, é benigno; o amor não é invejoso.', ref: '1 Coríntios 13:4', kind: 'Versículo' },
  { text: 'Sofremos mais na imaginação do que na realidade.', ref: 'Sêneca', kind: 'Estoico' },
  { text: 'Esforça-te, e tem bom ânimo; não temas, nem te espantes.', ref: 'Josué 1:9', kind: 'Versículo' },
  { text: 'A felicidade da tua vida depende da qualidade dos teus pensamentos.', ref: 'Marco Aurélio', kind: 'Estoico' },
  { text: 'Melhor é serem dois do que um, porque têm melhor paga do seu trabalho.', ref: 'Eclesiastes 4:9', kind: 'Versículo' },
  { text: 'Enquanto adiamos, a vida passa.', ref: 'Sêneca', kind: 'Estoico' },
  { text: 'As misericórdias do Senhor se renovam cada manhã.', ref: 'Lamentações 3:22-23', kind: 'Versículo' },
  { text: 'Primeiro diga a si mesmo o que quer ser; depois faça o que precisa ser feito.', ref: 'Epicteto', kind: 'Estoico' },
  { text: 'Aquietai-vos, e sabei que eu sou Deus.', ref: 'Salmos 46:10', kind: 'Versículo' },
  { text: 'O obstáculo à ação faz avançar a ação. O que fica no caminho se torna o caminho.', ref: 'Marco Aurélio', kind: 'Estoico' },
];
export function wordOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return DAILY_WORDS[day % DAILY_WORDS.length];
}
