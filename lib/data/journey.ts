/* Jornada a Dois — conteúdo do "coaching" do casal. Texto original. */

export const JOURNEY_RULES = [
  'Celular no silencioso e olho no olho.',
  'Um fala por vez. Quem está com o cartão fala; o outro só escuta.',
  'Sem "você sempre" e "você nunca". Fale de você: "eu sinto…".',
  'Pode pedir pausa a qualquer momento. Pausa não é fuga: combinem quando voltar.',
  'O objetivo não é ganhar a conversa, é ganhar o casamento.',
];

export interface QCard { q: string; level: 1 | 2 | 3 }
export const LEVELS = [
  { level: 1, name: 'Leve', emoji: '🌱', hint: 'Para aquecer e rir junto' },
  { level: 2, name: 'Fundo', emoji: '🌊', hint: 'Histórias, sonhos e feridas' },
  { level: 3, name: 'Coração', emoji: '🔥', hint: 'O que quase nunca se fala' },
] as const;

export const QUESTIONS: QCard[] = [
  // Leve
  { level: 1, q: 'Qual foi o momento mais engraçado que vivemos juntos?' },
  { level: 1, q: 'Se a gente tivesse um dia inteiro livre e dinheiro sobrando, o que faríamos?' },
  { level: 1, q: 'Qual mania minha você secretamente acha fofa?' },
  { level: 1, q: 'Qual comida te lembra a sua infância?' },
  { level: 1, q: 'Que música você colocaria na trilha sonora do nosso casamento hoje?' },
  { level: 1, q: 'Qual foi a primeira coisa que você reparou em mim?' },
  { level: 1, q: 'Se a gente fosse abrir um negócio juntos, qual seria?' },
  { level: 1, q: 'Qual lugar do mundo você quer conhecer comigo antes dos 50?' },
  { level: 1, q: 'O que te faz sentir em casa?' },
  { level: 1, q: 'Qual foi o melhor presente que você já ganhou (de qualquer pessoa)?' },
  { level: 1, q: 'O que você faria se tivesse uma hora só pra você amanhã?' },
  { level: 1, q: 'Qual hábito novo você quer ter no próximo ano?' },
  // Fundo
  { level: 2, q: 'Como era o casamento dos seus pais, e o que você quer repetir ou evitar?' },
  { level: 2, q: 'Em que momento você mais se sentiu amado(a) por mim?' },
  { level: 2, q: 'O que te deixa ansioso(a) hoje e eu talvez nem saiba?' },
  { level: 2, q: 'Qual sonho você deixou de lado e ainda pensa nele?' },
  { level: 2, q: 'Como você prefere ser consolado(a) quando está triste?' },
  { level: 2, q: 'O que eu faço que te faz sentir respeitado(a)?' },
  { level: 2, q: 'Qual foi a fase mais difícil da sua vida e o que te sustentou?' },
  { level: 2, q: 'O que significa "dinheiro" pra você: segurança, liberdade, medo?' },
  { level: 2, q: 'Como você imagina a nossa casa daqui a 10 anos?' },
  { level: 2, q: 'O que Deus tem falado com você ultimamente?' },
  { level: 2, q: 'O que você gostaria que eu perguntasse mais vezes?' },
  { level: 2, q: 'Em que área você sente que está crescendo, e em qual se sente parado(a)?' },
  // Coração
  { level: 3, q: 'Tem alguma mágoa minha que você ainda carrega?' },
  { level: 3, q: 'Quando você se sente sozinho(a) mesmo estando comigo?' },
  { level: 3, q: 'Qual medo você tem sobre o nosso futuro?' },
  { level: 3, q: 'O que eu poderia fazer esta semana que faria você se sentir escolhido(a)?' },
  { level: 3, q: 'Qual conversa a gente vive adiando?' },
  { level: 3, q: 'Do que você precisa de mim que tem vergonha de pedir?' },
  { level: 3, q: 'Onde você sente que eu não te entendo?' },
  { level: 3, q: 'O que te faria confiar ainda mais em mim?' },
  { level: 3, q: 'Qual parte de você você esconde até de mim?' },
  { level: 3, q: 'Se a gente pudesse recomeçar um dia do nosso casamento, qual seria e por quê?' },
];

/** Escuta guiada: espelhar, validar, empatizar. */
export const LISTEN_STEPS = [
  { title: 'Fale', who: 'speaker', hint: 'Quem fala: conte em até 2 minutos algo que está no seu coração. Fale de você ("eu sinto", "eu preciso").', seconds: 120 },
  { title: 'Espelhe', who: 'listener', hint: 'Quem escuta: repita com suas palavras. "Se eu entendi, você está dizendo que…". Depois pergunte: "entendi certo?"', seconds: 60 },
  { title: 'Valide', who: 'listener', hint: '"Faz sentido você se sentir assim, porque…". Validar não é concordar; é mostrar que a lógica dele(a) faz sentido.', seconds: 45 },
  { title: 'Empatize', who: 'listener', hint: '"Imagino que você esteja se sentindo…". Nomeie a emoção. Termine com: "tem mais alguma coisa?"', seconds: 45 },
  { title: 'Troquem', who: 'both', hint: 'Agora invertam os papéis. Quem escutou fala, quem falou escuta.', seconds: 0 },
];

/** Conversa difícil: fato → sentimento → necessidade → pedido. */
export const HARD_FIELDS = [
  { key: 'fact', label: 'O fato', hint: 'O que aconteceu, como uma câmera veria. Sem julgamento.', ph: 'Ontem você chegou às 22h sem avisar.' },
  { key: 'feel', label: 'O que eu senti', hint: 'Uma ou duas emoções.', ph: 'Me senti preocupada e um pouco desvalorizada.' },
  { key: 'need', label: 'Do que eu preciso', hint: 'A necessidade por trás.', ph: 'Preciso de previsibilidade e de me sentir lembrada.' },
  { key: 'ask', label: 'Meu pedido', hint: 'Algo concreto e possível, em forma de pedido.', ph: 'Você pode me mandar uma mensagem quando for atrasar?' },
];
export const FEELINGS = ['Triste', 'Magoado(a)', 'Frustrado(a)', 'Preocupado(a)', 'Sozinho(a)', 'Cansado(a)', 'Inseguro(a)', 'Desvalorizado(a)', 'Irritado(a)', 'Com medo', 'Confuso(a)', 'Envergonhado(a)'];

/** Mapa do outro: perguntas que o par responde sobre si (e o outro tenta adivinhar). */
export const MAP_ITEMS = [
  { key: 'love', label: 'Como eu mais me sinto amado(a)', options: ['Palavras de carinho', 'Tempo de qualidade', 'Presentes', 'Atos de serviço', 'Toque físico'] },
  { key: 'stress', label: 'Quando estou estressado(a) eu preciso de…', options: ['Espaço e silêncio', 'Conversar', 'Um abraço', 'Ajuda prática', 'Distração'] },
  { key: 'conflict', label: 'Numa briga eu costumo…', options: ['Me fechar', 'Falar alto', 'Querer resolver na hora', 'Precisar de um tempo', 'Chorar'] },
  { key: 'recharge', label: 'O que me recarrega', options: ['Ficar em casa', 'Sair com amigos', 'Natureza', 'Igreja', 'Dormir', 'Fazer algo criativo'] },
  { key: 'fear', label: 'Meu maior medo hoje', options: ['Dinheiro', 'Saúde', 'Futuro', 'Não ser suficiente', 'Família', 'Trabalho'] },
  { key: 'dream', label: 'Meu sonho do momento', options: ['Casa própria', 'Viajar', 'Filhos', 'Crescer no trabalho', 'Ministério', 'Negócio próprio'] },
  { key: 'apology', label: 'Um pedido de desculpas que funciona comigo', options: ['Reconhecer o erro', 'Mostrar que sente muito', 'Mudar a atitude', 'Reparar o que fez', 'Pedir perdão de verdade'] },
];

/** Roteiro de desculpas e perdão. */
export const APOLOGY_STEPS = [
  { title: 'Reconheça', hint: 'Diga o que você fez, sem "mas". "Eu errei quando…"' },
  { title: 'Sinta junto', hint: '"Imagino que isso te fez sentir…". Mostre que entende o impacto.' },
  { title: 'Assuma', hint: '"A responsabilidade é minha." Sem culpar o cansaço, o trabalho ou o outro.' },
  { title: 'Repare', hint: '"O que eu posso fazer para consertar?" Ouça a resposta.' },
  { title: 'Mude', hint: '"Da próxima vez eu vou…". Um compromisso pequeno e real.' },
  { title: 'Peça perdão', hint: '"Você me perdoa?" E dê tempo: perdão é decisão, confiança é processo.' },
];
export const FORGIVE_NOTE = 'Perdoar é escolher não cobrar a dívida, como Cristo fez conosco (Colossenses 3:13). Não significa fingir que não doeu, nem que a confiança volta no mesmo minuto.';

/** Trilhas de 7 dias. */
export interface Trail { id: string; title: string; emoji: string; hint: string; days: { t: string; d: string }[] }
export const TRAILS: Trail[] = [
  {
    id: 'reconnect', title: 'Reconectar', emoji: '🔗', hint: 'Para semanas corridas',
    days: [
      { t: '10 minutos sem celular', d: 'Sentem juntos 10 minutos, sem telas. Contem o melhor e o pior do dia.' },
      { t: 'Um elogio específico', d: 'Elogie algo concreto que o outro fez hoje. Não vale "você é legal".' },
      { t: 'Memória favorita', d: 'Cada um conta a lembrança favorita do casal e por quê.' },
      { t: 'Pergunta de nível 2', d: 'Abram a Jornada e respondam uma pergunta "Fundo".' },
      { t: 'Ajuda surpresa', d: 'Faça uma tarefa que normalmente é do outro, sem avisar.' },
      { t: 'Orem um pelo outro', d: 'Cada um ora em voz alta pelo outro, por algo específico.' },
      { t: 'Encontro simples', d: 'Um passeio, um sorvete, uma volta no quarteirão. Só vocês.' },
    ],
  },
  {
    id: 'communication', title: 'Comunicação', emoji: '💬', hint: 'Falar e ouvir melhor',
    days: [
      { t: 'Escuta guiada', d: 'Façam uma rodada da Escuta guiada sobre um assunto leve.' },
      { t: 'Sem interromper', d: 'Hoje, toda vez que o outro falar, espere ele terminar e conte até 2.' },
      { t: 'Mapa do outro', d: 'Preencham o Mapa do outro e comparem os palpites.' },
      { t: '"Eu sinto" em vez de "você"', d: 'Troquem críticas por frases começando com "eu sinto…".' },
      { t: 'O pedido', d: 'Cada um faz um pedido concreto para a semana que vem.' },
      { t: 'Conversa difícil (leve)', d: 'Usem a Conversa difícil com um tema pequeno, para treinar.' },
      { t: 'Avaliem a semana', d: 'De 0 a 10, quanto se sentiram ouvidos? O que ajudou?' },
    ],
  },
  {
    id: 'faith', title: 'Fé a dois', emoji: '🙏', hint: 'Deus no centro',
    days: [
      { t: 'Leiam Eclesiastes 4:9-12', d: 'Conversem: o que é o "cordão de três dobras" pra nós?' },
      { t: 'Gratidão em oração', d: 'Orem juntos só agradecendo, sem pedir nada.' },
      { t: 'Leiam 1 Coríntios 13', d: 'Cada um escolhe uma característica do amor para praticar.' },
      { t: 'Pedido de oração', d: 'Cada um conta algo pelo qual precisa de oração e o outro anota.' },
      { t: 'Servir juntos', d: 'Façam algo por alguém: uma visita, uma mensagem, uma ajuda.' },
      { t: 'Leiam Efésios 4:29-32', d: 'Que palavra a gente precisa tirar do nosso vocabulário?' },
      { t: 'Testemunho do casal', d: 'Registrem no app um testemunho do que Deus fez por vocês.' },
    ],
  },
  {
    id: 'peace', title: 'Depois da briga', emoji: '🕊️', hint: 'Restaurar com calma',
    days: [
      { t: 'Pausa combinada', d: 'Combinem uma palavra de pausa para usar quando a conversa esquentar.' },
      { t: 'Roteiro de desculpas', d: 'Quem precisar, use o Roteiro de desculpas. Sem pressa.' },
      { t: 'O que aprendemos', d: 'O que essa briga ensinou sobre o que cada um precisa?' },
      { t: 'Gesto de carinho', d: 'Um gesto pequeno de carinho, sem cobrar nada em troca.' },
      { t: 'Regra nova', d: 'Criem juntos uma regra de briga justa (ex.: não dormir brigados).' },
      { t: 'Riam juntos', d: 'Vejam algo engraçado juntos ou relembrem uma história boa.' },
      { t: 'Recomeço', d: 'Orem juntos e declarem um recomeço.' },
    ],
  },
];

export const BADGES = [
  { id: 'first', emoji: '🌱', title: 'Primeiro passo', need: 1, hint: '1 sessão concluída' },
  { id: 'five', emoji: '🌿', title: 'Constância', need: 5, hint: '5 sessões' },
  { id: 'ten', emoji: '🌳', title: 'Raízes', need: 10, hint: '10 sessões' },
  { id: 'trail', emoji: '🏔️', title: 'Trilheiros', need: 0, hint: 'Uma trilha de 7 dias completa' },
  { id: 'deep', emoji: '🔥', title: 'Coração aberto', need: 0, hint: '5 perguntas de nível Coração' },
];

export const HELP_NOTE = 'A Jornada ajuda, mas não substitui um pastor ou um terapeuta de casal. Se as conversas vivem terminando em briga, se existe medo ou desrespeito, procurem ajuda: pedir ajuda é sinal de cuidado.';
