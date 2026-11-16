# My Atlas — Life & Couple OS (v2)

App do casal: humor e carinho, agenda e tarefas, notas estilo Notion, ciclo menstrual completo (com intimidade),
hábitos e respiração, finanças, compras, datas especiais, metas, oração e cuidados com o Atlas.
Notificações aparecem na **Atlas Island**, ao redor da câmera frontal.

## Onde está cada coisa
| Parte | Onde |
|---|---|
| Web (Next.js 14) | Vercel → projeto `my-atlas` → https://my-atlas-zeta.vercel.app |
| Banco + login Google | Supabase → projeto `my-atlas` (schema em `supabase/schema.sql`) |
| App Android (APK) | `android/` → compilado pelo GitHub Actions → **Releases → latest → MyAtlas.apk** |

## Instalar no Android
1. Abra **github.com/eulazacruz/my-atlas/releases** no celular (logado no GitHub).
2. Baixe **MyAtlas.apk** e abra o arquivo. Se pedir, permita "instalar apps desconhecidos" para o navegador.
3. Pronto. Segure o ícone para ver os atalhos: Respirar · Despesa · +500ml · Carinho.

O APK é uma *Trusted Web Activity*: abre em tela cheia com o motor do Chrome (por isso o login Google funciona)
e recebe as melhorias do app automaticamente. Só é preciso reinstalar quando a parte Android mudar.

## Desenvolvimento
```bash
npm install
npm run dev     # sem .env.local o app abre em Modo Demo com os dois perfis
```
Variáveis (`.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ALLOWED_EMAILS`.

## Privacidade
- RLS em todas as tabelas: cada pessoa só vê os dados do próprio casal.
- Ciclo: só a dona edita; o parceiro só vê se ela ativar "Compartilhar com meu par".
- Notas privadas: só quem criou enxerga.
- `android/keystore/` guarda a chave de assinatura do APK. **Não apague**: sem ela não dá para atualizar o app instalado.
  Mantenha este repositório privado.

## Estrutura
```
app/                     layout, página única, /login, /auth/callback
components/shell/        AppShell, TabBar, BoxBreathing, hooks (useCycle, useTestIsland)
components/screens/      Hoje, Agenda+Tarefas, Notas+Editor, Saúde (Ciclo/Hábitos), Mais, Nós dois, Finanças, Compras, Atlas, Ajustes
components/sheets/       formulários (evento, tarefa, despesa, dia do ciclo, intimidade, datas, metas, oração)
components/island/       Atlas Island
lib/                     tipos, constantes, cálculo do ciclo, camada genérica do Supabase (db.ts), dados demo
supabase/                schema.sql + migrations/
android/                 projeto TWA + keystore
.github/workflows/       build do APK
```
