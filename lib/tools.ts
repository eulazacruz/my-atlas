/* Registro de "ferramentas": cada uma abre em sua própria página (rota "tool"). */
export type ToolTab = 'home' | 'faith' | 'health' | 'more';
export interface ToolMeta { title: string; hint: string; emoji: string; tab: ToolTab }

export const TOOL_META: Record<string, ToolMeta> = {
  /* Nós dois */
  social: { title: 'Nosso cantinho', hint: 'Instantes, timeline e mural', emoji: '📸', tab: 'home' },
  journey: { title: 'Jornada a Dois', hint: 'Conversas que aproximam', emoji: '🧭', tab: 'more' },
  games: { title: 'Jogos', hint: 'Quiz, memória e Pet Run', emoji: '🎮', tab: 'more' },
  wishlist: { title: 'Lista de desejos', hint: 'Reserve presentes em segredo', emoji: '🎁', tab: 'more' },
  challenges: { title: 'Desafios de 30 dias', hint: 'Pequenos hábitos a dois', emoji: '🏁', tab: 'more' },
  trilha: { title: 'Nossa trilha', hint: 'As músicas do casal', emoji: '🎵', tab: 'more' },
  idiomas: { title: 'Idiomas', hint: 'Inglês e espanhol com professor zoeiro', emoji: '🗣️', tab: 'more' },
  piggy: { title: 'Cofrinhos', hint: 'Sonhos com meta e progresso', emoji: '🐷', tab: 'more' },
  /* Saúde */
  nutrition: { title: 'Alimentação', hint: 'Refeições, prato e tabela TACO', emoji: '🥗', tab: 'health' },
  alarm: { title: 'Despertador', hint: 'Alarme com missão para acordar', emoji: '⏰', tab: 'health' },
  /* Mente */
  tests: { title: 'Autotestes', hint: 'Humor, ansiedade e bem-estar', emoji: '📋', tab: 'health' },
  thoughts: { title: 'Registro de pensamentos', hint: 'Desmonte o pensamento ansioso', emoji: '🧩', tab: 'health' },
  worry: { title: 'Hora da preocupação', hint: 'Estacione as preocupações', emoji: '🅿️', tab: 'health' },
  activate: { title: 'Ativar o dia', hint: 'Pequenas ações contra o desânimo', emoji: '⚡', tab: 'health' },
  breaths: { title: 'Respirações', hint: '4-7-8, suspiro duplo e coerência', emoji: '🌬️', tab: 'health' },
  mindgames: { title: 'Jogos da mente', hint: 'Detetive, reenquadrar, bolhas e foco', emoji: '🫧', tab: 'health' },
  safety: { title: 'Plano de segurança', hint: 'Para os dias mais difíceis', emoji: '🛟', tab: 'health' },
  care: { title: 'Rotina de cuidado', hint: 'Limites, desligar e lembretes', emoji: '🌙', tab: 'health' },
  /* Fé */
  psalm: { title: 'Palavra para o momento', hint: 'Um texto para o que você sente', emoji: '💬', tab: 'faith' },
  lectio: { title: 'Lectio Divina', hint: 'Ler, meditar, orar, descansar', emoji: '🕯️', tab: 'faith' },
  acts: { title: 'Oração em 4 partes', hint: 'Adoração, confissão, gratidão, súplica', emoji: '🙌', tab: 'faith' },
  examen: { title: 'Revisão do dia com Deus', hint: '5 minutos antes de dormir', emoji: '🌌', tab: 'faith' },
  prayertimes: { title: 'Horários de oração', hint: '3 pausas por dia', emoji: '🔔', tab: 'faith' },
  fruit: { title: 'Fruto do Espírito', hint: 'Autoavaliação da semana', emoji: '🍇', tab: 'faith' },
  gifts: { title: 'Dons espirituais', hint: 'Descubra como você serve', emoji: '🎁', tab: 'faith' },
  grace: { title: 'Mapa da Graça', hint: 'A linha do tempo com Deus', emoji: '🗺️', tab: 'faith' },
  narrated: { title: 'Bíblia narrada', hint: 'Ouça qualquer capítulo', emoji: '🎧', tab: 'faith' },
  churchday: { title: 'Dia de culto', hint: 'Modo igreja e pergunta do dia', emoji: '⛪', tab: 'faith' },
};

export const toolTab = (id?: string | null): ToolTab => (id && TOOL_META[id]?.tab) || 'more';
