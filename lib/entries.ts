/* Configuração das coleções genéricas (tabela "entries"). */
import type { Entry } from './types';

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'time' | 'select' | 'rating' | 'photo' | 'check' | 'steps' | 'lines';
export interface Field {
  key: string; // 'title' | 'body' | 'date' | 'done' | 'private' ou chave em data
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  required?: boolean;
  def?: unknown;
}
export interface KindConfig {
  kind: string;
  title: string;
  singular: string;
  emoji: string;
  hint: string;
  fields: Field[];
  sort?: 'date-desc' | 'date-asc' | 'created-desc' | 'title';
  privateDefault?: boolean;
  allowPrivate?: boolean;
  empty?: string;
}

const T = (label = 'Título', placeholder = ''): Field => ({ key: 'title', label, type: 'text', required: true, placeholder });
const B = (label = 'Anotações', placeholder = ''): Field => ({ key: 'body', label, type: 'textarea', placeholder });
const D = (label = 'Data', def: unknown = 'today'): Field => ({ key: 'date', label, type: 'date', def });

export const KINDS: Record<string, KindConfig> = {
  /* ───── Produtividade ───── */
  idea: { kind: 'idea', title: 'Caixa de ideias', singular: 'Ideia', emoji: '💡', hint: 'Capture tudo que surgir', allowPrivate: true, sort: 'created-desc', fields: [T('Ideia', 'O que veio à mente?'), { key: 'tag', label: 'Tipo', type: 'select', options: ['Conteúdo', 'Casa', 'Trabalho', 'Negócio', 'Pessoal', 'Igreja'] }, B('Detalhes')] },
  book: { kind: 'book', title: 'Livros', singular: 'Livro', emoji: '📚', hint: 'O que estão lendo', sort: 'created-desc', fields: [T('Livro'), { key: 'author', label: 'Autor', type: 'text' }, { key: 'status', label: 'Status', type: 'select', options: ['Lendo', 'Quero ler', 'Lido'], def: 'Lendo' }, { key: 'pages', label: 'Páginas', type: 'number' }, { key: 'page', label: 'Página atual', type: 'number' }, { key: 'rating', label: 'Nota', type: 'rating' }, { key: 'quotes', label: 'Frases que marcaram', type: 'textarea' }] },
  learning: { kind: 'learning', title: 'Aprendizados', singular: 'Aprendizado', emoji: '🧠', hint: 'Uma linha por dia', sort: 'date-desc', allowPrivate: true, fields: [T('O que aprendi hoje'), D(), B('Detalhes')] },
  goal: { kind: 'goal', title: 'Metas do ano', singular: 'Meta', emoji: '🎯', hint: 'Os grandes objetivos', sort: 'created-desc', fields: [T('Meta'), { key: 'area', label: 'Área', type: 'select', options: ['Fé', 'Família', 'Saúde', 'Finanças', 'Carreira', 'Pessoal'] }, { key: 'target', label: 'Alvo (número)', type: 'number', placeholder: 'Ex.: 12' }, { key: 'current', label: 'Progresso atual', type: 'number', def: 0 }, { key: 'unit', label: 'Unidade', type: 'text', placeholder: 'livros, kg, R$…' }, D('Prazo', `${new Date().getFullYear()}-12-31`), { key: 'steps', label: 'Marcos do mês', type: 'steps' }] },
  project: { kind: 'project', title: 'Projetos', singular: 'Projeto', emoji: '🧩', hint: 'Grandes objetivos em etapas', sort: 'created-desc', fields: [T('Projeto'), D('Prazo', null), { key: 'owner', label: 'Responsável', type: 'select', options: ['Eu', 'Nós dois', 'Meu amor'], def: 'Nós dois' }, { key: 'steps', label: 'Etapas', type: 'steps' }, B('Descrição')] },
  /* ───── Fé ───── */
  devotional: { kind: 'devotional', title: 'Devocionais', singular: 'Devocional', emoji: '✍️', hint: 'Escritura, observação, aplicação e oração', sort: 'date-desc', fields: [{ key: 'ref', label: 'Texto', type: 'text', placeholder: 'Mateus 5' }, T('Título', 'O que Deus me falou hoje'), D(), { key: 's', label: 'Escritura · o versículo que marcou', type: 'textarea' }, { key: 'o', label: 'Observação · o que o texto diz', type: 'textarea' }, { key: 'a', label: 'Aplicação · como viver isso hoje', type: 'textarea' }, { key: 'p', label: 'Oração', type: 'textarea' }] },
  memory: { kind: 'memory', title: 'Memorizar', singular: 'Versículo', emoji: '🧷', hint: 'Cartões que voltam na hora certa', sort: 'created-desc', fields: [{ key: 'ref', label: 'Referência', type: 'text', placeholder: 'Filipenses 4:6-7', required: true }, B('Texto do versículo')] },
  sermon: { kind: 'sermon', title: 'Anotações do culto', singular: 'Culto', emoji: '⛪', hint: 'Pregação, texto base e anotações', sort: 'date-desc', fields: [T('Tema da mensagem'), D(), { key: 'preacher', label: 'Pregador', type: 'text' }, { key: 'ref', label: 'Texto base', type: 'text', placeholder: 'Romanos 8:28' }, B('Anotações'), { key: 'apply', label: 'O que vou aplicar', type: 'textarea' }] },
  fast: { kind: 'fast', title: 'Jejum', singular: 'Jejum', emoji: '🕊️', hint: 'Propósito, início e fim', sort: 'date-desc', fields: [T('Propósito'), D('Início'), { key: 'start', label: 'Hora de início', type: 'time', def: 'now' }, { key: 'hours', label: 'Duração (horas)', type: 'number', def: 12 }, { key: 'type', label: 'Tipo', type: 'select', options: ['Total', 'Só água', 'Daniel', 'Redes sociais', 'Outro'] }, { key: 'together', label: 'Jejum juntos', type: 'check' }, B('Anotações e respostas')] },
  church: { kind: 'church', title: 'Agenda da igreja', singular: 'Compromisso', emoji: '📅', hint: 'Cultos, células e ensaios', sort: 'date-asc', fields: [T('Compromisso'), D(), { key: 'time', label: 'Horário', type: 'time' }, { key: 'type', label: 'Tipo', type: 'select', options: ['Culto', 'Célula', 'Ensaio', 'Evento', 'Reunião'] }, { key: 'who', label: 'Quem vai', type: 'select', options: ['Nós dois', 'Eu', 'Meu amor'], def: 'Nós dois' }, { key: 'place', label: 'Local', type: 'text' }] },
  serve: { kind: 'serve', title: 'Servir', singular: 'Escala', emoji: '🙌', hint: 'Escalas de ministério', sort: 'date-asc', fields: [T('Ministério'), D(), { key: 'role', label: 'Função', type: 'text' }, { key: 'who', label: 'Quem serve', type: 'select', options: ['Eu', 'Meu amor', 'Nós dois'], def: 'Eu' }, B()] },
  person: { kind: 'person', title: 'Pessoas para cuidar', singular: 'Pessoa', emoji: '🤝', hint: 'Orar, ligar e visitar', sort: 'title', fields: [T('Nome'), { key: 'relation', label: 'Quem é', type: 'select', options: ['Família', 'Amigo', 'Igreja', 'Trabalho', 'Vizinho'] }, { key: 'phone', label: 'WhatsApp', type: 'text', placeholder: '81 9…' }, { key: 'every', label: 'Falar a cada (dias)', type: 'number', def: 14 }, { key: 'last', label: 'Último contato', type: 'date', def: 'today' }, { key: 'pray', label: 'Motivo de oração', type: 'textarea' }] },
  testimony: { kind: 'testimony', title: 'Testemunhos', singular: 'Testemunho', emoji: '🌟', hint: 'O que Deus fez', sort: 'date-desc', fields: [T('O que Deus fez'), D(), B('A história')] },
  /* ───── Mente ───── */
  emotion: { kind: 'emotion', title: 'Diário de emoções', singular: 'Registro', emoji: '🫧', hint: 'O que sentiu e o que ajudou', sort: 'created-desc', privateDefault: true, allowPrivate: true, fields: [{ key: 'title', label: 'Emoção', type: 'select', options: ['Alegria', 'Paz', 'Gratidão', 'Esperança', 'Ansiedade', 'Tristeza', 'Raiva', 'Medo', 'Cansaço', 'Solidão'], required: true }, { key: 'level', label: 'Intensidade', type: 'rating', def: 3 }, D(), { key: 'cause', label: 'O que causou', type: 'textarea' }, { key: 'helped', label: 'O que ajudou', type: 'textarea' }] },
  win: { kind: 'win', title: 'Conquistas', singular: 'Conquista', emoji: '🏅', hint: 'Para reler nos dias difíceis', sort: 'date-desc', allowPrivate: true, fields: [T('O que eu consegui'), D(), B('Como foi')] },
  limit: { kind: 'limit', title: 'Limites da semana', singular: 'Limite', emoji: '🛡️', hint: 'Combinados com você mesmo', sort: 'created-desc', fields: [T('Limite', 'Sem trabalho depois das 20h'), { key: 'why', label: 'Por quê', type: 'textarea' }] },
  /* ───── Corpo ───── */
  workout: { kind: 'workout', title: 'Treinos', singular: 'Treino', emoji: '🏋️', hint: 'O que treinou e quanto', sort: 'date-desc', fields: [{ key: 'title', label: 'Tipo', type: 'select', options: ['Musculação', 'Corrida', 'Caminhada', 'Funcional', 'Bike', 'Futebol', 'Outro'], required: true }, D(), { key: 'minutes', label: 'Minutos', type: 'number', def: 45 }, { key: 'feel', label: 'Como se sentiu', type: 'rating', def: 4 }, B('Exercícios e cargas')] },
  measure: { kind: 'measure', title: 'Peso e medidas', singular: 'Medição', emoji: '⚖️', hint: 'Só para quem quiser', sort: 'date-desc', privateDefault: true, allowPrivate: true, fields: [D(), { key: 'weight', label: 'Peso (kg)', type: 'number', required: true }, { key: 'waist', label: 'Cintura (cm)', type: 'number' }, B('Observações')] },
  /* ───── Casa & lazer ───── */
  recipe: { kind: 'recipe', title: 'Receitas da casa', singular: 'Receita', emoji: '🍲', hint: 'Viram lista de compras', sort: 'title', fields: [T('Receita'), { key: 'photo', label: 'Foto', type: 'photo' }, { key: 'minutes', label: 'Tempo (min)', type: 'number' }, { key: 'ingredients', label: 'Ingredientes (um por linha)', type: 'lines' }, B('Modo de preparo')] },
  document: { kind: 'document', title: 'Documentos e garantias', singular: 'Documento', emoji: '🧾', hint: 'Notas, garantias e vencimentos', sort: 'date-asc', fields: [T('Item'), { key: 'type', label: 'Tipo', type: 'select', options: ['Garantia', 'Nota fiscal', 'Documento', 'Seguro', 'Contrato', 'Outro'] }, D('Vence em', null), { key: 'photo', label: 'Foto', type: 'photo' }, B()] },
  plan: { kind: 'plan', title: 'Planos da família', singular: 'Plano', emoji: '🏡', hint: 'Sonhos com passo a passo', sort: 'date-asc', fields: [T('Sonho', 'Casa própria, viagem, filhos…'), D('Para quando', null), { key: 'cost', label: 'Quanto custa', type: 'money' }, { key: 'saved', label: 'Já temos', type: 'money' }, { key: 'steps', label: 'Passo a passo', type: 'steps' }, B()] },
  watch: { kind: 'watch', title: 'Filmes e séries', singular: 'Título', emoji: '🎬', hint: 'Para ver juntos', sort: 'created-desc', fields: [T('Título'), { key: 'type', label: 'Tipo', type: 'select', options: ['Filme', 'Série', 'Documentário'], def: 'Filme' }, { key: 'where', label: 'Onde', type: 'select', options: ['Netflix', 'Prime', 'Disney+', 'Max', 'Globoplay', 'YouTube', 'Cinema', 'Outro'] }, { key: 'status', label: 'Status', type: 'select', options: ['Quero ver', 'Vendo', 'Visto'], def: 'Quero ver' }, { key: 'rating', label: 'Nota', type: 'rating' }] },
  place: { kind: 'place', title: 'Lugares favoritos', singular: 'Lugar', emoji: '📍', hint: 'Restaurantes e passeios', sort: 'created-desc', fields: [T('Lugar'), { key: 'type', label: 'Tipo', type: 'select', options: ['Restaurante', 'Café', 'Passeio', 'Praia', 'Viagem', 'Outro'] }, { key: 'rating', label: 'Nota', type: 'rating' }, { key: 'again', label: 'Queremos voltar', type: 'check', def: true }, { key: 'address', label: 'Endereço', type: 'text' }, { key: 'photo', label: 'Foto', type: 'photo' }, B('O que pedir / dicas')] },
  trip: { kind: 'trip', title: 'Viagens', singular: 'Viagem', emoji: '✈️', hint: 'Roteiro, gastos e mala', sort: 'date-desc', fields: [T('Destino'), D('Ida', null), { key: 'end', label: 'Volta', type: 'date' }, { key: 'budget', label: 'Orçamento', type: 'money' }, { key: 'spent', label: 'Já gastamos', type: 'money' }, { key: 'packing', label: 'Mala', type: 'steps' }, { key: 'itinerary', label: 'Roteiro', type: 'textarea' }] },
  /* ───── v6 ───── */
  wish: { kind: 'wish', title: 'Lista de desejos', singular: 'Desejo', emoji: '🎁', hint: 'O outro pode reservar em segredo', sort: 'created-desc', fields: [T('O que eu quero'), { key: 'price', label: 'Preço aproximado', type: 'money' }, { key: 'link', label: 'Link', type: 'text', placeholder: 'https://' }, { key: 'prio', label: 'Vontade', type: 'rating', def: 3 }, { key: 'photo', label: 'Foto', type: 'photo' }, B('Detalhes (tamanho, cor…)')] },
  song: { kind: 'song', title: 'Nossa trilha', singular: 'Música', emoji: '🎵', hint: 'As músicas do casal e suas histórias', sort: 'date-asc', fields: [T('Música'), { key: 'artist', label: 'Artista', type: 'text' }, D('Quando virou nossa', null), { key: 'link', label: 'Link (Spotify/YouTube)', type: 'text', placeholder: 'https://' }, B('A história')] },
  piggy: { kind: 'piggy', title: 'Cofrinhos de sonhos', singular: 'Cofrinho', emoji: '🐷', hint: 'Caixinhas com meta', sort: 'created-desc', fields: [T('Sonho', 'Viagem, carro, casa…'), { key: 'emoji', label: 'Emoji', type: 'text', def: '✈️' }, { key: 'goal', label: 'Meta', type: 'money', required: true }, D('Para quando', null)] },
  grace: { kind: 'grace', title: 'Mapa da Graça', singular: 'Marco', emoji: '🗺️', hint: 'A linha do tempo do que Deus fez', sort: 'date-asc', fields: [T('O que aconteceu'), D('Quando'), { key: 'type', label: 'Tipo', type: 'select', options: ['Conversão', 'Livramento', 'Resposta de oração', 'Provisão', 'Cura', 'Chamado', 'Deserto', 'Recomeço'] }, { key: 'ref', label: 'Versículo daquele tempo', type: 'text' }, B('A história')] },
  capsule: { kind: 'capsule', title: 'Cápsula do casal', singular: 'Cápsula', emoji: '💌', hint: 'Mensagens para o futuro', sort: 'date-asc', fields: [T('Título', 'Para o nosso 3º aniversário'), { key: 'date', label: 'Abrir em', type: 'date', required: true, def: null }, B('Mensagem')] },
};
export const kindOf = (k: string) => KINDS[k];

export function sortEntries(list: Entry[], s: KindConfig['sort'] = 'created-desc') {
  const by = [...list];
  if (s === 'title') return by.sort((a, b) => a.title.localeCompare(b.title));
  if (s === 'date-asc') return by.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
  if (s === 'date-desc') return by.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  return by.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}
export const getField = (e: Entry, key: string) => (['title', 'body', 'date', 'done', 'private'].includes(key) ? (e as unknown as Record<string, unknown>)[key] : e.data?.[key]);
