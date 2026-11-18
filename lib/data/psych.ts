/* Saúde mental: autotestes de rastreio (não são diagnóstico), TCC e respirações. */

export interface Test {
  id: 'phq9' | 'gad7' | 'who5';
  name: string;
  short: string;
  intro: string;
  options: { label: string; value: number }[];
  items: string[];
  max: number;
  bands: { upTo: number; label: string; tone: 'ok' | 'mild' | 'warn' | 'high'; text: string }[];
  /** WHO-5 multiplica por 4 (0–100) */
  scale?: number;
}

const FREQ = [
  { label: 'Nenhuma vez', value: 0 },
  { label: 'Vários dias', value: 1 },
  { label: 'Mais da metade dos dias', value: 2 },
  { label: 'Quase todos os dias', value: 3 },
];

export const TESTS: Test[] = [
  {
    id: 'phq9', name: 'Humor (PHQ-9)', short: 'Humor', intro: 'Nas últimas 2 semanas, com que frequência você foi incomodado(a) por…',
    options: FREQ, max: 27,
    items: [
      'Pouco interesse ou pouco prazer em fazer as coisas',
      'Se sentir para baixo, deprimido(a) ou sem perspectiva',
      'Dificuldade para pegar no sono, continuar dormindo ou dormir demais',
      'Se sentir cansado(a) ou com pouca energia',
      'Falta de apetite ou comer demais',
      'Se sentir mal consigo mesmo(a), achar que é um fracasso ou que decepcionou sua família',
      'Dificuldade para se concentrar, como ao ler ou ver TV',
      'Lentidão para se mover ou falar que outros notaram, ou o contrário: agitação fora do normal',
      'Pensar em se ferir de alguma forma ou que seria melhor estar morto(a)',
    ],
    bands: [
      { upTo: 4, label: 'Mínimo', tone: 'ok', text: 'Sinais mínimos. Continue cuidando do sono, da fé e das relações.' },
      { upTo: 9, label: 'Leve', tone: 'mild', text: 'Sinais leves. Vale observar nas próximas semanas e conversar com alguém de confiança.' },
      { upTo: 14, label: 'Moderado', tone: 'warn', text: 'Sinais moderados. Uma conversa com um psicólogo ou médico pode ajudar muito.' },
      { upTo: 19, label: 'Moderadamente grave', tone: 'high', text: 'Sinais importantes. Procure um profissional de saúde mental nos próximos dias.' },
      { upTo: 27, label: 'Grave', tone: 'high', text: 'Sinais fortes. Procure ajuda profissional o quanto antes. Você não precisa passar por isso sozinho(a).' },
    ],
  },
  {
    id: 'gad7', name: 'Ansiedade (GAD-7)', short: 'Ansiedade', intro: 'Nas últimas 2 semanas, com que frequência você foi incomodado(a) por…',
    options: FREQ, max: 21,
    items: [
      'Se sentir nervoso(a), ansioso(a) ou muito tenso(a)',
      'Não conseguir parar ou controlar as preocupações',
      'Se preocupar demais com coisas diferentes',
      'Dificuldade para relaxar',
      'Ficar tão agitado(a) que é difícil ficar parado(a)',
      'Ficar facilmente irritado(a) ou chateado(a)',
      'Sentir medo, como se algo horrível fosse acontecer',
    ],
    bands: [
      { upTo: 4, label: 'Mínimo', tone: 'ok', text: 'Ansiedade mínima. As respirações e a hora da preocupação ajudam a manter assim.' },
      { upTo: 9, label: 'Leve', tone: 'mild', text: 'Ansiedade leve. Experimente o registro de pensamentos e a respiração 4-7-8.' },
      { upTo: 14, label: 'Moderado', tone: 'warn', text: 'Ansiedade moderada. Conversar com um psicólogo pode trazer ferramentas valiosas.' },
      { upTo: 21, label: 'Grave', tone: 'high', text: 'Ansiedade forte. Procure um profissional de saúde mental.' },
    ],
  },
  {
    id: 'who5', name: 'Bem-estar (WHO-5)', short: 'Bem-estar', intro: 'Nas últimas 2 semanas…',
    options: [
      { label: 'Nunca', value: 0 }, { label: 'Às vezes', value: 1 }, { label: 'Menos da metade do tempo', value: 2 },
      { label: 'Mais da metade do tempo', value: 3 }, { label: 'Na maior parte do tempo', value: 4 }, { label: 'O tempo todo', value: 5 },
    ],
    max: 25, scale: 4,
    items: [
      'Me senti alegre e de bom humor',
      'Me senti calmo(a) e tranquilo(a)',
      'Me senti ativo(a) e com energia',
      'Acordei me sentindo descansado(a)',
      'Meu dia a dia esteve cheio de coisas que me interessam',
    ],
    bands: [
      { upTo: 7, label: 'Bem-estar baixo', tone: 'high', text: 'Seu bem-estar está baixo. Vale fazer também o teste de humor e conversar com alguém.' },
      { upTo: 12, label: 'Atenção', tone: 'warn', text: 'Bem-estar abaixo do ideal. Pequenas atividades prazerosas ajudam (veja "Ativar o dia").' },
      { upTo: 18, label: 'Bom', tone: 'mild', text: 'Bem-estar bom.' },
      { upTo: 25, label: 'Ótimo', tone: 'ok', text: 'Bem-estar ótimo. Que bom!' },
    ],
  },
];

export const bandOf = (t: Test, raw: number) => t.bands.find((b) => raw <= b.upTo) ?? t.bands[t.bands.length - 1];
export const TEST_NOTE = 'Isto é um rastreio, não um diagnóstico. Só um profissional pode avaliar de verdade. Seus resultados ficam privados: só você vê.';
export const CVV = { phone: '188', label: 'CVV · 188', hint: 'Ligação gratuita, 24h, ou chat em cvv.org.br' };

/** Distorções cognitivas (TCC) */
export const DISTORTIONS = [
  { id: 'catastrofe', name: 'Catastrofização', emoji: '🌋', hint: 'Esperar sempre o pior cenário.', ex: 'Se eu errar essa apresentação, vou ser demitido.' },
  { id: 'tudo-nada', name: 'Tudo ou nada', emoji: '⚫', hint: 'Ver tudo em preto e branco.', ex: 'Se não for perfeito, foi um fracasso.' },
  { id: 'leitura', name: 'Leitura mental', emoji: '🔮', hint: 'Achar que sabe o que o outro pensa.', ex: 'Ele não respondeu, deve estar com raiva de mim.' },
  { id: 'generalizar', name: 'Generalização', emoji: '♾️', hint: 'Um caso vira "sempre" ou "nunca".', ex: 'Nada dá certo pra mim.' },
  { id: 'rotulo', name: 'Rótulos', emoji: '🏷️', hint: 'Se definir por um erro.', ex: 'Sou um idiota.' },
  { id: 'deveria', name: '"Deveria"', emoji: '📏', hint: 'Regras rígidas sobre si e os outros.', ex: 'Eu deveria dar conta de tudo sozinho.' },
  { id: 'filtro', name: 'Filtro negativo', emoji: '🕶️', hint: 'Só enxergar o lado ruim.', ex: 'Recebi 10 elogios e 1 crítica; só penso na crítica.' },
  { id: 'emocional', name: 'Raciocínio emocional', emoji: '🌧️', hint: 'Sentir é igual a ser verdade.', ex: 'Me sinto inútil, então eu sou inútil.' },
  { id: 'personalizar', name: 'Personalização', emoji: '🎯', hint: 'Achar que tudo é culpa sua.', ex: 'Ela está triste por minha causa.' },
  { id: 'futuro', name: 'Adivinhação', emoji: '🎱', hint: 'Prever o futuro como fato.', ex: 'Não vai dar certo, nem adianta tentar.' },
];

/** Jogo: detetive de pensamentos. Frase → distorção correta. */
export const DETECTIVE = [
  { s: 'Ela visualizou e não respondeu. Com certeza fiz algo errado.', a: 'leitura' },
  { s: 'Se eu não passar nessa prova, minha vida acabou.', a: 'catastrofe' },
  { s: 'Errei a receita. Eu nunca faço nada direito.', a: 'generalizar' },
  { s: 'Tirei 8, não 10. Fui um desastre.', a: 'tudo-nada' },
  { s: 'Eu deveria estar mais adiantado na vida a essa altura.', a: 'deveria' },
  { s: 'O chefe fez uma crítica. O resto da reunião não importa.', a: 'filtro' },
  { s: 'Estou com medo, então deve ser perigoso.', a: 'emocional' },
  { s: 'A reunião foi ruim por minha culpa, com certeza.', a: 'personalizar' },
  { s: 'Nem vou tentar, sei que vão dizer não.', a: 'futuro' },
  { s: 'Esqueci o aniversário dele. Sou uma péssima pessoa.', a: 'rotulo' },
  { s: 'Ele chegou sério; deve estar pensando em terminar.', a: 'leitura' },
  { s: 'Se o carro quebrar de novo, vamos falir.', a: 'catastrofe' },
  { s: 'Minha casa precisa estar sempre impecável.', a: 'deveria' },
  { s: 'Nada na minha semana foi bom.', a: 'filtro' },
  { s: 'Me sinto um fracasso, logo sou um.', a: 'emocional' },
  { s: 'Todo mundo sempre me deixa de lado.', a: 'generalizar' },
];

/** Jogo: reenquadrar. Frase negativa → escolha a resposta mais equilibrada. */
export const REFRAME = [
  { s: 'Nunca vou conseguir sair das dívidas.', opts: ['Verdade, não tem jeito.', 'Está difícil agora, mas dá para dar um passo por mês.', 'Vou ignorar o problema.'], a: 1 },
  { s: 'Todo mundo é melhor do que eu.', opts: ['Cada um tem um caminho; tenho qualidades reais também.', 'Sim, eu sou o pior.', 'Os outros são falsos.'], a: 0 },
  { s: 'Se eu pedir ajuda, vão achar que sou fraco.', opts: ['Melhor sofrer calado.', 'Pedir ajuda é coragem; as pessoas costumam gostar de ajudar.', 'Ninguém liga mesmo.'], a: 1 },
  { s: 'Errei com minha esposa, não mereço perdão.', opts: ['Ela nunca vai esquecer.', 'Vou fingir que não aconteceu.', 'Posso reconhecer, pedir perdão e mudar; erro não é identidade.'], a: 2 },
  { s: 'Hoje foi um dia perdido.', opts: ['Teve partes difíceis, e eu ainda fiz algumas coisas.', 'Amanhã vai ser igual.', 'Sou preguiçoso.'], a: 0 },
  { s: 'Deus deve estar decepcionado comigo.', opts: ['Ele desistiu de mim.', 'A graça dele não depende do meu desempenho (Romanos 8:1).', 'Preciso compensar sendo perfeito.'], a: 1 },
  { s: 'Vou ser demitido, certeza.', opts: ['Não tenho provas disso; posso pedir feedback e me preparar.', 'É melhor pedir demissão antes.', 'Não adianta fazer nada.'], a: 0 },
  { s: 'Meu corpo é horrível.', opts: ['Ninguém nunca vai me achar bonito.', 'Meu corpo me carrega todos os dias; posso cuidar dele com gentileza.', 'Vou parar de comer.'], a: 1 },
];

/** Ativação comportamental: atividades pequenas, de prazer (P) ou de domínio (D). */
export const ACTIVITIES = [
  { t: 'Caminhar 10 minutos ao ar livre', k: 'P' }, { t: 'Tomar sol por 15 minutos', k: 'P' }, { t: 'Ouvir 3 louvores que eu amo', k: 'P' },
  { t: 'Ligar para um amigo', k: 'P' }, { t: 'Tomar um banho demorado', k: 'P' }, { t: 'Cozinhar algo gostoso', k: 'P' },
  { t: 'Brincar com o pet', k: 'P' }, { t: 'Ver o pôr do sol', k: 'P' }, { t: 'Ler 10 páginas de um livro', k: 'P' },
  { t: 'Arrumar a cama', k: 'D' }, { t: 'Lavar a louça', k: 'D' }, { t: 'Responder um e-mail que estou adiando', k: 'D' },
  { t: 'Organizar uma gaveta', k: 'D' }, { t: 'Pagar uma conta', k: 'D' }, { t: 'Fazer 15 minutos de exercício', k: 'D' },
  { t: 'Planejar as refeições da semana', k: 'D' }, { t: 'Ler um capítulo da Bíblia', k: 'D' }, { t: 'Beber 2 copos de água', k: 'D' },
];

export interface Breath { id: string; name: string; hint: string; steps: { label: 'Inspire' | 'Segure' | 'Expire' | 'Inspire mais'; s: number }[]; rounds: number }
export const BREATHS: Breath[] = [
  { id: '478', name: '4-7-8', hint: 'Para dormir e acalmar', rounds: 4, steps: [{ label: 'Inspire', s: 4 }, { label: 'Segure', s: 7 }, { label: 'Expire', s: 8 }] },
  { id: 'sigh', name: 'Suspiro duplo', hint: 'Alívio rápido em 1 minuto', rounds: 5, steps: [{ label: 'Inspire', s: 2 }, { label: 'Inspire mais', s: 1 }, { label: 'Expire', s: 6 }] },
  { id: 'coherence', name: 'Coerência', hint: '5,5 respirações por minuto', rounds: 10, steps: [{ label: 'Inspire', s: 5.5 }, { label: 'Expire', s: 5.5 }] },
  { id: 'box', name: 'Quadrada', hint: 'Foco e controle', rounds: 4, steps: [{ label: 'Inspire', s: 4 }, { label: 'Segure', s: 4 }, { label: 'Expire', s: 4 }, { label: 'Segure', s: 4 }] },
];

export const SAFETY_PLAN = [
  { key: 'signs', label: 'Sinais de que estou entrando numa crise', ph: 'Não consigo dormir, me isolo…' },
  { key: 'cope', label: 'O que eu posso fazer sozinho(a) para me acalmar', ph: 'Respiração, banho, louvor, caminhar…' },
  { key: 'people', label: 'Pessoas e lugares que me distraem', ph: 'Minha esposa, minha mãe, a igreja…' },
  { key: 'help', label: 'Quem eu posso chamar para pedir ajuda', ph: 'Nome e telefone' },
  { key: 'pro', label: 'Profissionais e serviços', ph: 'Psicólogo, CAPS, CVV 188, SAMU 192' },
  { key: 'safe', label: 'Como deixar meu ambiente mais seguro', ph: '' },
  { key: 'reason', label: 'Meus motivos para viver', ph: 'Minha família, meus sonhos, Deus…' },
];
