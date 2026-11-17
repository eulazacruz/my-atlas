/* Espiritualidade: salmo para o momento, Lectio, ACTS, exame, fruto, dons, quiz bíblico. */

/** Emoção → passagens (livro id da BLIVRE, capítulo, versículos) */
export const PSALM_FOR: Record<string, { label: string; emoji: string; refs: { b: number; c: number; v?: [number, number] }[] }> = {
  ansioso: { label: 'Ansioso', emoji: '😰', refs: [{ b: 19, c: 23 }, { b: 50, c: 4, v: [6, 7] }, { b: 40, c: 6, v: [25, 34] }, { b: 19, c: 94, v: [18, 19] }] },
  triste: { label: 'Triste', emoji: '😢', refs: [{ b: 19, c: 34, v: [17, 18] }, { b: 19, c: 42 }, { b: 19, c: 30, v: [4, 5] }, { b: 23, c: 41, v: [10, 10] }] },
  medo: { label: 'Com medo', emoji: '😨', refs: [{ b: 19, c: 91 }, { b: 19, c: 27 }, { b: 23, c: 43, v: [1, 3] }, { b: 6, c: 1, v: [9, 9] }] },
  cansado: { label: 'Cansado', emoji: '🥱', refs: [{ b: 40, c: 11, v: [28, 30] }, { b: 23, c: 40, v: [28, 31] }, { b: 19, c: 62, v: [1, 2] }] },
  culpado: { label: 'Culpado', emoji: '😔', refs: [{ b: 19, c: 51 }, { b: 19, c: 32, v: [1, 5] }, { b: 62, c: 1, v: [9, 9] }, { b: 45, c: 8, v: [1, 1] }] },
  sozinho: { label: 'Sozinho', emoji: '🫥', refs: [{ b: 19, c: 139, v: [1, 12] }, { b: 5, c: 31, v: [6, 8] }, { b: 40, c: 28, v: [20, 20] }] },
  irritado: { label: 'Irritado', emoji: '😠', refs: [{ b: 19, c: 37, v: [1, 8] }, { b: 49, c: 4, v: [26, 32] }, { b: 59, c: 1, v: [19, 20] }] },
  grato: { label: 'Grato', emoji: '🙏', refs: [{ b: 19, c: 103 }, { b: 19, c: 100 }, { b: 52, c: 5, v: [16, 18] }] },
  alegre: { label: 'Alegre', emoji: '😄', refs: [{ b: 19, c: 16 }, { b: 19, c: 126 }, { b: 50, c: 4, v: [4, 4] }] },
  confuso: { label: 'Sem direção', emoji: '🧭', refs: [{ b: 20, c: 3, v: [5, 6] }, { b: 19, c: 32, v: [8, 8] }, { b: 59, c: 1, v: [5, 5] }, { b: 23, c: 30, v: [21, 21] }] },
};

export const LECTIO = [
  { title: 'Lectio · Ler', hint: 'Leia o texto devagar, duas vezes. Qual palavra ou frase chamou sua atenção?', key: 'word' },
  { title: 'Meditatio · Meditar', hint: 'Repita essa palavra. Por que ela tocou você hoje? O que ela diz sobre a sua vida agora?', key: 'med' },
  { title: 'Oratio · Orar', hint: 'Responda a Deus com sinceridade: gratidão, pedido, confissão.', key: 'pray' },
  { title: 'Contemplatio · Descansar', hint: 'Fique 1 minuto em silêncio, apenas na presença dele.', key: 'rest', timer: 60 },
];
export const LECTIO_TEXTS = [
  { b: 19, c: 23 }, { b: 43, c: 15, v: [1, 11] as [number, number] }, { b: 23, c: 40, v: [28, 31] as [number, number] }, { b: 40, c: 5, v: [1, 12] as [number, number] },
  { b: 50, c: 4, v: [4, 9] as [number, number] }, { b: 19, c: 139, v: [1, 14] as [number, number] }, { b: 45, c: 8, v: [31, 39] as [number, number] }, { b: 42, c: 15, v: [11, 24] as [number, number] },
];

export const ACTS = [
  { key: 'a', title: 'Adoração', hint: 'Quem Deus é. Exalte um atributo dele.', ph: 'Senhor, tu és fiel…' },
  { key: 'c', title: 'Confissão', hint: 'Onde eu errei. Seja honesto, ele já sabe.', ph: 'Perdoa-me por…' },
  { key: 't', title: 'Gratidão', hint: 'Três coisas pelas quais agradecer hoje.', ph: 'Obrigado por…' },
  { key: 's', title: 'Súplica', hint: 'Pedidos: por você, pelo casal, pelos outros.', ph: 'Te peço por…' },
];

export const EXAMEN = [
  { key: 'presence', title: 'Presença', hint: 'Respire e lembre que Deus está aqui. Peça luz para enxergar o seu dia.' },
  { key: 'grat', title: 'Gratidão', hint: 'Do que você é grato(a) hoje? Até as coisas pequenas.' },
  { key: 'emotion', title: 'Emoções', hint: 'O que você sentiu hoje? Onde sentiu Deus perto ou longe?' },
  { key: 'one', title: 'Um momento', hint: 'Escolha um momento do dia e converse com Deus sobre ele.' },
  { key: 'tomorrow', title: 'Amanhã', hint: 'O que você pede para amanhã?' },
];

export const FRUITS = [
  { key: 'amor', name: 'Amor', emoji: '❤️' }, { key: 'alegria', name: 'Alegria', emoji: '😊' }, { key: 'paz', name: 'Paz', emoji: '🕊️' },
  { key: 'paciencia', name: 'Paciência', emoji: '⏳' }, { key: 'amabilidade', name: 'Amabilidade', emoji: '🤗' }, { key: 'bondade', name: 'Bondade', emoji: '🌻' },
  { key: 'fidelidade', name: 'Fidelidade', emoji: '🤝' }, { key: 'mansidao', name: 'Mansidão', emoji: '🌾' }, { key: 'dominio', name: 'Domínio próprio', emoji: '🧭' },
];

/** Teste de dons: cada afirmação aponta para um dom. Nota de 0 a 3. */
export const GIFTS: Record<string, { name: string; text: string; verse: string }> = {
  ensino: { name: 'Ensino', text: 'Você ama explicar a Palavra com clareza.', verse: 'Romanos 12:7' },
  servico: { name: 'Serviço', text: 'Você enxerga necessidades práticas e age.', verse: 'Romanos 12:7' },
  exortacao: { name: 'Encorajamento', text: 'Suas palavras levantam quem está caído.', verse: 'Romanos 12:8' },
  generosidade: { name: 'Generosidade', text: 'Dar com alegria é natural para você.', verse: 'Romanos 12:8' },
  lideranca: { name: 'Liderança', text: 'Você organiza pessoas em direção a um propósito.', verse: 'Romanos 12:8' },
  misericordia: { name: 'Misericórdia', text: 'Você sente a dor do outro e cuida.', verse: 'Romanos 12:8' },
  hospitalidade: { name: 'Hospitalidade', text: 'Sua casa e sua presença acolhem.', verse: '1 Pedro 4:9' },
  fe: { name: 'Fé', text: 'Você confia em Deus quando outros duvidam.', verse: '1 Coríntios 12:9' },
  intercessao: { name: 'Intercessão', text: 'Orar pelos outros é seu lugar.', verse: 'Tiago 5:16' },
  evangelismo: { name: 'Evangelismo', text: 'Falar de Jesus flui com naturalidade.', verse: 'Efésios 4:11' },
  sabedoria: { name: 'Sabedoria', text: 'Pessoas te procuram para conselho.', verse: '1 Coríntios 12:8' },
  criatividade: { name: 'Criatividade', text: 'Você serve a Deus com arte, música, design.', verse: 'Êxodo 31:3-5' },
};
export const GIFT_ITEMS: { s: string; g: keyof typeof GIFTS }[] = [
  { s: 'Gosto de estudar a Bíblia para explicar para outras pessoas.', g: 'ensino' },
  { s: 'Quando alguém não entende algo, eu acho um jeito simples de explicar.', g: 'ensino' },
  { s: 'Prefiro ajudar nos bastidores do que estar à frente.', g: 'servico' },
  { s: 'Percebo rápido o que precisa ser feito e faço.', g: 'servico' },
  { s: 'Gosto de mandar mensagens para animar quem está desanimado.', g: 'exortacao' },
  { s: 'As pessoas dizem que se sentem melhor depois de falar comigo.', g: 'exortacao' },
  { s: 'Sinto alegria em dar dinheiro ou coisas para quem precisa.', g: 'generosidade' },
  { s: 'Organizo minhas finanças para poder ajudar mais.', g: 'generosidade' },
  { s: 'Naturalmente assumo a frente quando um grupo está perdido.', g: 'lideranca' },
  { s: 'Gosto de planejar e delegar tarefas.', g: 'lideranca' },
  { s: 'Me compadeço fácil de quem está sofrendo.', g: 'misericordia' },
  { s: 'Gosto de visitar doentes ou pessoas sozinhas.', g: 'misericordia' },
  { s: 'Amo receber pessoas em casa.', g: 'hospitalidade' },
  { s: 'Faço visitantes se sentirem à vontade rapidinho.', g: 'hospitalidade' },
  { s: 'Mesmo quando tudo parece impossível, eu acredito que Deus vai agir.', g: 'fe' },
  { s: 'Já vi Deus responder coisas que eu pedi com muita confiança.', g: 'fe' },
  { s: 'Oro pelos outros por longos períodos sem cansar.', g: 'intercessao' },
  { s: 'Mantenho uma lista de pessoas pelas quais oro.', g: 'intercessao' },
  { s: 'Converso sobre Jesus com desconhecidos sem dificuldade.', g: 'evangelismo' },
  { s: 'Penso em formas de alcançar quem não conhece a Deus.', g: 'evangelismo' },
  { s: 'Pessoas me pedem conselho em decisões difíceis.', g: 'sabedoria' },
  { s: 'Consigo enxergar a melhor saída numa situação confusa.', g: 'sabedoria' },
  { s: 'Uso arte, música, design ou vídeo para comunicar a fé.', g: 'criatividade' },
  { s: 'Tenho ideias criativas para o culto ou ministério.', g: 'criatividade' },
];

export interface QuizQ { q: string; o: string[]; a: number; ref?: string }
export const BIBLE_QUIZ: QuizQ[] = [
  { q: 'Quantos livros tem a Bíblia protestante?', o: ['66', '73', '72', '39'], a: 0 },
  { q: 'Quem construiu a arca?', o: ['Moisés', 'Noé', 'Abraão', 'Davi'], a: 1, ref: 'Gênesis 6' },
  { q: 'Qual é o menor versículo da Bíblia?', o: ['"Jesus chorou."', '"Orai sem cessar."', '"Deus é amor."', '"Alegrai-vos."'], a: 0, ref: 'João 11:35' },
  { q: 'Quem foi engolido por um grande peixe?', o: ['Elias', 'Jonas', 'Pedro', 'Daniel'], a: 1, ref: 'Jonas 1' },
  { q: 'Qual discípulo negou Jesus três vezes?', o: ['João', 'Judas', 'Pedro', 'Tomé'], a: 2, ref: 'Lucas 22' },
  { q: 'Quantos dias e noites choveu no dilúvio?', o: ['7', '12', '40', '100'], a: 2, ref: 'Gênesis 7:12' },
  { q: 'Quem matou o gigante Golias?', o: ['Saul', 'Sansão', 'Davi', 'Josué'], a: 2, ref: '1 Samuel 17' },
  { q: 'Onde Jesus nasceu?', o: ['Nazaré', 'Belém', 'Jerusalém', 'Cafarnaum'], a: 1, ref: 'Mateus 2:1' },
  { q: 'Qual foi o primeiro milagre de Jesus?', o: ['Andar sobre as águas', 'Multiplicar pães', 'Água em vinho', 'Curar um cego'], a: 2, ref: 'João 2' },
  { q: 'Quem escreveu a maior parte dos Salmos?', o: ['Salomão', 'Davi', 'Asafe', 'Moisés'], a: 1 },
  { q: 'Qual o livro mais longo da Bíblia?', o: ['Gênesis', 'Isaías', 'Salmos', 'Jeremias'], a: 2 },
  { q: 'Quem era o pai de João Batista?', o: ['Zacarias', 'José', 'Simeão', 'Eli'], a: 0, ref: 'Lucas 1' },
  { q: 'Em que livro estão os Dez Mandamentos (a primeira vez)?', o: ['Levítico', 'Êxodo', 'Números', 'Deuteronômio'], a: 1, ref: 'Êxodo 20' },
  { q: 'Qual mulher foi rainha e salvou seu povo?', o: ['Rute', 'Débora', 'Ester', 'Raabe'], a: 2, ref: 'Ester' },
  { q: 'Quantos discípulos Jesus escolheu?', o: ['7', '10', '12', '70'], a: 2 },
  { q: 'Quem foi jogado na cova dos leões?', o: ['Daniel', 'José', 'Jeremias', 'Ezequiel'], a: 0, ref: 'Daniel 6' },
  { q: 'O fruto do Espírito tem quantas características?', o: ['7', '9', '10', '12'], a: 1, ref: 'Gálatas 5:22-23' },
  { q: 'Quem escreveu a carta aos Romanos?', o: ['Pedro', 'João', 'Paulo', 'Tiago'], a: 2 },
  { q: 'Qual o primeiro livro do Novo Testamento?', o: ['Marcos', 'Mateus', 'Lucas', 'Atos'], a: 1 },
  { q: 'Quem foi vendido pelos irmãos como escravo?', o: ['Benjamim', 'José', 'Jacó', 'Isaque'], a: 1, ref: 'Gênesis 37' },
  { q: 'Qual profeta subiu ao céu num carro de fogo?', o: ['Eliseu', 'Elias', 'Isaías', 'Enoque'], a: 1, ref: '2 Reis 2' },
  { q: '"O Senhor é o meu pastor" está em qual Salmo?', o: ['1', '23', '91', '121'], a: 1 },
  { q: 'Quem era a sogra de Rute?', o: ['Orfa', 'Noemi', 'Sara', 'Ana'], a: 1, ref: 'Rute 1' },
  { q: 'Quantos anos o povo andou no deserto?', o: ['12', '30', '40', '70'], a: 2 },
  { q: 'Quem era cobrador de impostos e subiu numa árvore para ver Jesus?', o: ['Mateus', 'Zaqueu', 'Nicodemos', 'Bartimeu'], a: 1, ref: 'Lucas 19' },
  { q: 'Qual o último livro da Bíblia?', o: ['Judas', 'Apocalipse', 'Malaquias', '3 João'], a: 1 },
  { q: 'Quem traiu Jesus por 30 moedas de prata?', o: ['Pedro', 'Judas Iscariotes', 'Tomé', 'Barrabás'], a: 1 },
  { q: 'Qual é o "capítulo do amor"?', o: ['João 3', 'Romanos 8', '1 Coríntios 13', 'Salmos 91'], a: 2 },
  { q: 'Qual era a profissão de Lucas?', o: ['Pescador', 'Médico', 'Carpinteiro', 'Fariseu'], a: 1, ref: 'Colossenses 4:14' },
  { q: 'Quem liderou o povo na entrada em Canaã depois de Moisés?', o: ['Arão', 'Calebe', 'Josué', 'Gideão'], a: 2 },
];
