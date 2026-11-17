/* Jogos e desafios. */

/** "Quanto você me conhece?": um responde sobre si (escolhendo), o outro tenta acertar. */
export const KNOW_ME = [
  { q: 'Minha comida favorita é…', o: ['Massa', 'Churrasco', 'Comida japonesa', 'Feijoada', 'Pizza', 'Hambúrguer'] },
  { q: 'Num dia de folga, eu prefiro…', o: ['Ficar em casa', 'Sair para comer', 'Praia', 'Ver série', 'Igreja/amigos', 'Dormir'] },
  { q: 'O que mais me irrita é…', o: ['Atraso', 'Bagunça', 'Barulho', 'Mentira', 'Fome', 'Calor'] },
  { q: 'Meu maior sonho agora é…', o: ['Casa própria', 'Viajar o mundo', 'Ter filhos', 'Negócio próprio', 'Crescer na carreira', 'Ministério'] },
  { q: 'Quando estou triste eu…', o: ['Fico calado(a)', 'Choro', 'Como', 'Durmo', 'Oro', 'Quero conversar'] },
  { q: 'Minha estação favorita é…', o: ['Verão', 'Inverno', 'Outono', 'Primavera'] },
  { q: 'Meu tipo de filme favorito…', o: ['Comédia', 'Ação', 'Romance', 'Terror', 'Drama', 'Animação'] },
  { q: 'Eu sou mais…', o: ['Matutino(a)', 'Noturno(a)'] },
  { q: 'Meu jeito de receber amor favorito…', o: ['Palavras', 'Tempo juntos', 'Presentes', 'Ajuda prática', 'Abraços'] },
  { q: 'Se eu ganhasse R$ 10 mil hoje…', o: ['Guardaria', 'Viajaria', 'Pagaria dívidas', 'Investiria', 'Daria para alguém', 'Compraria algo'] },
  { q: 'Minha bebida preferida…', o: ['Café', 'Suco', 'Refrigerante', 'Água', 'Chá', 'Açaí'] },
  { q: 'O que eu faria primeiro num lugar novo…', o: ['Comer', 'Tirar fotos', 'Explorar', 'Descansar', 'Fazer compras'] },
  { q: 'Meu maior medo…', o: ['Altura', 'Perder alguém', 'Falhar', 'Doença', 'Bichos', 'Solidão'] },
  { q: 'Eu me acho mais…', o: ['Organizado(a)', 'Espontâneo(a)'] },
  { q: 'Programa perfeito a dois…', o: ['Jantar fora', 'Filme no sofá', 'Viagem', 'Passeio ao ar livre', 'Cozinhar juntos'] },
];

export interface Challenge { id: string; title: string; emoji: string; hint: string; daily: string[] }
export const CHALLENGES: Challenge[] = [
  { id: 'nophone', title: 'Jantar sem celular', emoji: '📵', hint: '30 dias de mesa sem tela', daily: ['Jantem sem celular na mesa.'] },
  { id: 'praise', title: 'Um elogio por dia', emoji: '💐', hint: 'Elogios específicos e sinceros', daily: ['Elogie algo específico do outro hoje.'] },
  { id: 'pray22', title: 'Orar juntos às 22h', emoji: '🙏', hint: 'Antes de dormir, juntos', daily: ['Orem juntos antes de dormir.'] },
  { id: 'gratitude', title: '3 gratidões', emoji: '📝', hint: 'Escrevam 3 coisas boas do dia', daily: ['Anotem 3 gratidões do dia.'] },
  { id: 'walk', title: 'Caminhada a dois', emoji: '🚶', hint: '20 minutos juntos', daily: ['Caminhem 20 minutos juntos.'] },
  { id: 'nocomplain', title: 'Sem reclamar', emoji: '🤐', hint: 'Troque reclamação por pedido', daily: ['Nenhuma reclamação: só pedidos gentis.'] },
  { id: 'bible', title: 'Um capítulo por dia', emoji: '📖', hint: 'Leiam o mesmo capítulo', daily: ['Leiam juntos um capítulo da Bíblia.'] },
  { id: 'kindness', title: 'Gentileza surpresa', emoji: '🎁', hint: 'Um gesto inesperado por dia', daily: ['Faça uma gentileza surpresa.'] },
];

export const RUN_TIPS = ['Toque para pular', 'Desvie dos ossos de borracha… quer dizer, pegue os ossos!', 'Pule os hidrantes'];
