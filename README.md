# Relatório de Reembolso de Passagem

App web multi-usuário para funcionários registrarem os deslocamentos do dia a
dia (ônibus e barca) e gerarem o PDF de reembolso do período — substituindo a
planilha Excel preenchida à mão.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Supabase** — Postgres, Auth (e-mail/senha) e RLS
- **Resend** — SMTP do Supabase para o e-mail de redefinição
- **pdf-lib** — geração do PDF
- **Vercel** — deploy

## Como rodar localmente

```bash
# 1. dependências
npm install

# 2. variáveis de ambiente
cp .env.example .env.local
# preencha com os valores do Supabase Dashboard > Project Settings > API
# (.env.local é ignorado pelo Git — nenhuma chave entra no repositório)

# 3. banco de dados
# abra o SQL Editor do Supabase e rode o conteúdo de supabase/schema.sql

# 4. servidor de desenvolvimento
npm run dev
```

Aplicação em http://localhost:3000.

## Scripts

| Comando             | O que faz                                |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento              |
| `npm run build`     | Build de produção (roda lint + tipos)    |
| `npm run start`     | Sobe o build de produção                 |
| `npm run lint`      | ESLint                                   |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm test`          | Suíte de testes (Node puro, sem runner)  |

## Autenticação

E-mail e senha via Supabase Auth. A sessão vive em cookie, então o servidor lê
o mesmo login que o browser.

| Rota            | O que faz                                                     |
| --------------- | ------------------------------------------------------------- |
| `/auth/login`   | Entrar                                                         |
| `/auth/signup`  | Criar conta pedindo nome e superior imediato                   |
| `/auth/forgot`  | Pedir o link de redefinição de senha                           |
| `/auth/reset`   | Escolher a senha nova                                          |
| `/auth/confirm` | Troca o token do e-mail por sessão e redireciona               |

O `src/middleware.ts` renova a sessão a cada requisição, manda quem não está
logado para o login (guardando o destino em `?redirect=`) e tira quem já está
logado das telas de login e cadastro.

### E-mail de redefinição

Quem envia é o Supabase, configurado em *Authentication > SMTP Settings* para
falar com o Resend. O app só pede o envio — não gera link, não guarda chave de
e-mail e **não precisa da chave secreta**, aquela que ignora a RLS. Uma chave
a menos em produção é uma chave a menos para vazar.

Ajuste em *Authentication > Email Templates* o template **Reset password**
para apontar para:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset
```

E o **Confirm signup** para:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
```

### Segredos e privacidade

Chave nenhuma mora no repositório. `.env.local` está no `.gitignore`; em
produção, as variáveis vão nos *Environment Variables* da Vercel.

O app roda **sem nenhuma chave secreta**: as duas variáveis do Supabase são
públicas por natureza, e é a RLS que segura o acesso. Não existe caminho no
código que ignore a RLS, porque não existe chave capaz disso — o que evita a
pior falha possível aqui, uma consulta que devolvesse trecho de outra pessoa.

**O e-mail do usuário não vai para o HTML.** O cabeçalho mostra o nome do
perfil, nunca o endereço, e a tela de nova senha exibe o e-mail mascarado
(`cd•••@yahoo.com`) só para confirmar de qual conta se trata.

**O cookie de sessão é `httpOnly`.** O token carrega o e-mail e o id do
usuário; sem isso, qualquer script na página leria tudo com `document.cookie`.
Só é possível porque o app inteiro fala com o Supabase pelo servidor — não
existe cliente de browser do Supabase no projeto. Um componente de cliente que
venha a precisar da sessão vai falhar, e a decisão terá de ser revista de
propósito.

Todas as respostas levam `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy` e HSTS, e o `X-Powered-By` é omitido.

## Perfil e preços

Em `/dashboard/perfil` ficam o nome e o superior imediato (o cabeçalho do
relatório) e a tabela de passagens.

Cadastrar a passagem uma vez basta: o valor é reaproveitado a cada
lançamento. No reajuste, use **Editar** — mudou o valor, o registro atual é
desativado e nasce outro no mesmo grupo, então o histórico fica de pé e os
trechos antigos continuam com o valor da época. Mudou só o nome, o transporte
ou o cartão, a alteração é feita no próprio registro, porque aí não houve
reajuste nenhum.

**Arquivar** tira a passagem da lista sem apagar nada.

O campo de valor aceita `4,70`, `R$ 4,70`, `4.70` ou `1.234,56`. Recusa
`1.234`: em português é mil duzentos e trinta e quatro, em inglês é um e
vinte e três, e chutar em dinheiro é pior do que pedir para digitar de novo.

## Lançamento de trechos

Em `/dashboard/trips`, dois caminhos:

**Por local** — escolha o local e a data. A ida sai inteira e, com a caixa da
volta marcada, os trechos espelhados vêm junto. Um local de dois ônibus lança
quatro linhas de uma vez. O valor usado é sempre o do preço vigente, não o
guardado no cadastro do local.

**Na mão** — para o dia fora do comum. **A unidade é o dia, não o trecho**:
você declara a ida inteira antes de confirmar, acrescentando *"Peguei outra
condução nesta ida"* para cada ônibus ou barca. A origem do trecho seguinte já
vem preenchida com o destino do anterior, porque quem desce da barca embarca
ali mesmo. A caixa *"Voltou para casa pelo mesmo caminho?"* vem marcada e
espelha a ida inteira, e uma prévia do percurso mostra o que será gravado
antes de salvar.

Lançar trecho a trecho seria diferente e errado: a caixa da volta, aplicada a
um trecho isolado, não sabe que existe um segundo trecho, e o dia sairia como
duas viagens fechadas em si — ia e voltava do ônibus, ia e voltava da barca.
Tem teste de regressão em `tests/trips.test.ts`.

Escolher uma passagem cadastrada preenche transporte, cartão, valor e chuta a
linha a partir do nome (`Ônibus 323` → `323`), tudo editável.

A tabela abaixo mostra os últimos 30 dias agrupados por dia, com total do dia,
edição no lugar, exclusão de um trecho e exclusão do dia inteiro. Bairros e
clientes têm autocomplete do que você já usou, pelo `datalist` do próprio
navegador — sem biblioteca e funcionando no celular.

### Locais

O caminho mais curto para criar um: lance o dia uma vez e clique em **Salvar
como local** no cabeçalho dele, na lista de lançamentos. A rota já está na
tela — redigitá-la seria trabalho repetido com chance de errar. O app
reconhece qual metade do dia é a ida detectando o espelho (`outboundOf`, em
`src/lib/trips.ts`), em vez de cortar ao meio: um dia com duas saídas
separadas não é espelho de nada, e ali o corte sairia errado.

Se um trecho salvo bater em transporte, cartão e valor com uma passagem
cadastrada — e só uma —, o local guarda o vínculo e passa a acompanhar
reajuste. Com duas passagens do mesmo preço não dá para saber qual foi, então
ele guarda o valor fixo em vez de chutar.

Em `/dashboard/locais` você cadastra **só a ida**, trecho por trecho, na ordem
em que pega cada condução. A volta nunca é cadastrada: ela é derivada na hora
do lançamento invertendo a ordem, trocando origem com destino e pondo
`Residência` no cliente. A regra vive em `src/lib/trips.ts`, isolada da tela.

Excluir um local não mexe em nada que já foi lançado.

## Período e resumo

O `/dashboard` é a tela do relatório. O período fica na URL
(`?de=2026-07-01&ate=2026-07-15`), então dá para guardar nos favoritos o link
do fechamento de um mês específico. O filtro é um `<form method="get">`
comum — funciona sem JavaScript.

As datas são livres — escolha qualquer início e qualquer fim. O app **lembra
o último período escolhido** (cookie `periodo`, um ano), porque poucos
fechamentos caem em quinzena certinha: quem fecha de 20 a 04 não deveria
reescolher as datas toda vez que abre o app.

A ordem de decisão é: o que está na URL, depois o último período escolhido,
e só então a quinzena de hoje — que é o ponto de partida de quem nunca
escolheu nada. Os atalhos das duas quinzenas e do mês inteiro continuam ali.
Datas invertidas são endireitadas; datas incompletas ou inválidas caem no
padrão em vez de montar um intervalo que ninguém pediu.

Acima da tabela ficam os quatro números do rodapé — total RIO CARD, total
JAÉ, total geral e quantidade de trechos — e logo abaixo a prévia do
relatório, no formato final. É essa prévia que a F6 vira PDF.

A tabela tem **uma coluna de valor**, com o cartão dito em cada linha por uma
etiqueta. A planilha antiga usava duas colunas, uma por cartão, com uma delas
sempre vazia; o que importa é ficar claro qual cartão pagou, e os totais
separados por cartão continuam no rodapé, que é o que o financeiro usa.

Somas de centavos em ponto flutuante acumulam sujeira (`211.09999999999994`),
então o total é arredondado no fim, em `src/lib/report.ts`.

## Formulários

Toda validação acontece no servidor e volta **campo a campo**: o input erra
com `aria-invalid`, a mensagem aparece embaixo dele e todos os problemas vêm
de uma vez, em vez de um por envio. Erros que não pertencem a um campo —
falha de gravação, sessão expirada — continuam num aviso no topo.

Os componentes de `src/components/ui` são escritos só com Tailwind, sem
biblioteca de UI: `TextField` e `SelectField` cuidam de rótulo, dica, erro e
autocomplete; `SubmitButton` desabilita e mostra progresso pelo `useFormStatus`
com um SVG próprio; `Card` agrupa o conteúdo das páginas.

## PDF

O botão **Baixar PDF** no relatório chama `/dashboard/relatorio/pdf`, que lê o
mesmo período da tela e devolve o arquivo com `Content-Disposition:
attachment` — o navegador baixa direto, sem abrir aba nem passar por diálogo
de impressão. O nome sai como `reembolso-2026-08-01-a-2026-08-15.pdf`.

A montagem está em `src/lib/pdf.ts`, com **pdf-lib**: JavaScript puro, sem
binário nativo e sem arquivos de fonte para empacotar, então sobe na Vercel
sem configuração. Puppeteer exigiria um Chromium dentro da função e o PDFKit
precisaria levar métricas de fonte que costumam quebrar no build.

Detalhes que valem saber:

- A4 retrato. A folha abre com a faixa de carvão sangrando até a borda, o
  fio verde embaixo e o nome **Tecnoarte** — a mesma barra superior do app,
  que é o que separa um documento de empresa de uma folha com texto em cima.
  Depois vêm funcionário, superior e período, a tabela zebrada e o rodapé.
- A coluna do cartão segue a regra da tela: verde é RIO CARD, ocre é JAÉ. O
  nome do cartão continua escrito, então a impressão em preto e branco não
  perde informação nenhuma.
- **TOTAL GERAL** fecha em carvão com texto branco. É o número que a pessoa
  vai receber; o olho tem de achá-lo sem procurar.
- Todas as páginas levam nome e período no rodapé. Folha de reembolso
  desgarra fácil na mesa do financeiro, e sem isso não dá para saber de quem
  ela é.
- Quebra de página repete o cabeçalho da tabela; os totais nunca se partem ao
  meio, e a numeração sai como `Página 2 de 3`.
- Texto que não cabe na coluna é cortado com reticências.
- As fontes padrão do PDF usam WinAnsi, que cobre o português mas não tudo;
  `sanitize()` troca aspas curvas, travessões e qualquer caractere de fora
  antes de desenhar — um só derrubaria a geração inteira.

## Testes

```bash
npm test
```

Roda no `node:test` embutido, sem runner nem dependência de teste. Um resolvedor
de 30 linhas em `tests/resolver.mjs` ensina o Node a entender o atalho `@/` e a
extensão implícita dos imports, do mesmo jeito que o Next faz pelo tsconfig.

A suíte cobre a lógica que não pode errar:

| Arquivo               | O que protege                                              |
| --------------------- | ---------------------------------------------------------- |
| `trips.test.ts`       | O espelho da volta: ordem invertida, origem/destino trocados, cliente `Residência`. Reproduz o dia da planilha linha por linha |
| `period.test.ts`      | Quinzenas, fevereiro bissexto, intervalo invertido, cookie corrompido |
| `format.test.ts`      | Leitura de `4,70` / `R$ 4,70` / `1.234,56`, e data que não anda um dia por fuso |
| `report.test.ts`      | Totais por cartão e o arredondamento que evita `211.09999999999994` |
| `validation.test.ts`  | Redirecionamento que não escapa do app, máscara de e-mail, erros traduzidos sem vazar detalhe interno |
| `pdf.test.ts`         | PDF válido, quebra de página e acento que não derruba a geração |
| `fares.test.ts`       | Passagem preenchendo o trecho e a dedução da linha pelo nome |
| `route.test.ts`       | A linha de percurso, incluindo o dia com duas saídas separadas |

## Estrutura

```
src/
  app/                 rotas (App Router)
  components/
    auth/              formulários de login, cadastro e senha
    dashboard/         filtro de período, cards e prévia do relatório
    locais/            cadastro dos locais e seus trechos de ida
    perfil/            dados do cabeçalho e CRUD de passagens
    trips/             lançamento, atalho por local e tabela editável
    ui/                campo, seleção, alerta, cartão e botão de envio
  lib/
    env.ts             leitura das variáveis de ambiente
    form-state.ts      estado devolvido pelas actions de formulário
    format.ts          valores em reais e datas em pt-BR
    fares.ts           passagem escolhida preenchendo o trecho
    suggestions.ts     autocomplete de bairros e clientes
    pdf.ts             montagem do PDF do relatório
    period.ts          período do relatório, quinzenas e leitura da URL
    report.ts          totais por cartão, trechos e dias
    trips.ts           espelho da volta e montagem dos trechos
    rate-limit.ts      trava de repetição no envio de e-mail
    resend.ts          e-mail de redefinição de senha
    validation.ts      validações e tradução dos erros do Supabase
    supabase/
      server.ts        cliente para Server Components / Actions
      cookies.ts       opções do cookie de sessão (httpOnly)
      admin.ts         cliente service role (só servidor)
      middleware.ts    renovação de sessão e controle de acesso
  middleware.ts        entrada do middleware do Next
  types/
    database.ts        tipos espelhando o schema do Postgres
    index.ts           rótulos e regras de domínio (cartão padrão etc.)
supabase/
  schema.sql           schema completo + RLS (idempotente)
  migrations/          alterações para bancos que já existiam
```

## Modelo de dados

| Tabela        | Para que serve                                                        |
| ------------- | --------------------------------------------------------------------- |
| `profiles`    | Nome do funcionário e do superior imediato (cabeçalho do relatório)   |
| `fare_prices` | Valores de passagem cadastrados uma vez, com histórico de reajustes   |
| `trips`       | Um registro por **trecho** (um dia normal tem 4: ida e volta)         |
| `places`      | Local de trabalho recorrente (ex: `HCNI`) — o atalho de lançamento    |
| `place_legs`  | Trechos da **ida** daquele local, em ordem (2 ônibus = 2 registros)    |

**Relatório não é salvo.** Não existe tabela de relatórios: os trechos em
`trips` são a única fonte, e o PDF é montado na hora a partir do período
escolhido. O que fica guardado para reaproveitar são os **locais**.

Todas as tabelas têm RLS ligada com `auth.uid()`, então cada usuário só
enxerga os próprios dados.

Detalhes que valem lembrar:

- **Cartão é campo próprio.** O padrão é ônibus → JAÉ e barca → RIO CARD, mas
  o usuário pode trocar (a linha 143C, por exemplo, é ônibus paga no RIO CARD).
- **Reajuste não sobrescreve preço.** A linha antiga vira `active = false` e um
  novo registro é criado, preservando o histórico.
- **`trips.value` é uma cópia.** Um reajuste futuro não altera relatórios já
  fechados.
- **`trips.leg_order` guarda a ordem do trecho.** O `now()` do Postgres é o
  horário da transação, então os quatro trechos de um dia nascem com
  `created_at` idêntico; sem a coluna, a ordem da ida e da volta se perde e o
  relatório sai embaralhado.
- **Local salvo lança o dia inteiro.** Você cadastra o `HCNI` uma vez dizendo
  que a ida são dois ônibus; no dia, escolhe o local e a data e o app grava os
  quatro trechos — a volta sai espelhada da ida (ordem invertida, origem e
  destino trocados, cliente `Residência`).
- **O valor vem sempre do preço vigente.** `place_legs.fare_group_id` aponta
  para o grupo em `fare_prices`, então um reajuste já entra nos próximos
  lançamentos sem precisar reeditar o local.

## Deploy na Vercel

1. Importe o repositório na Vercel (o framework é detectado sozinho).
2. Em **Settings › Environment Variables**, preencha o que está no
   `.env.example`. No mínimo `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL` com a URL de
   produção.
3. Publique de novo. Variável `NEXT_PUBLIC_*` é embutida durante o build, então
   preencher depois só vale no próximo deploy.
4. No Supabase, em **Authentication › URL Configuration**, coloque a Site URL
   de produção e acrescente `https://SEU-APP.vercel.app/auth/confirm` nas
   Redirect URLs.

Antes das variáveis existirem, o app não quebra: as telas mostram um aviso
dizendo o que falta preencher.

## Fases

- [x] **F1** Setup: projeto, Supabase clients, tipos, schema SQL + RLS
- [x] **F2** Auth: login, cadastro, recuperação de senha, middleware
- [x] **F3** Perfil: nome, superior e CRUD de preços com histórico
- [x] **F4** Trips: lançamento, regra do cartão, simular volta, locais salvos
      (cadastrar e aplicar em uma data), tabela editável
- [x] **F5** Filtro de período e cards de resumo
- [x] **F6** Geração do PDF no formato do relatório
- [x] **F7** Polish: validações, estados de carregamento, mobile, deploy
