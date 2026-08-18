# Relatório de Reembolso de Passagem

App web multi-usuário para funcionários registrarem os deslocamentos do dia a
dia (ônibus e barca) e gerarem o PDF de reembolso do período — substituindo a
planilha Excel preenchida à mão.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Supabase** — Postgres, Auth (e-mail/senha) e RLS
- **Resend** — e-mail de redefinição de senha
- **Vercel** — deploy

## Como rodar localmente

```bash
# 1. dependências
npm install

# 2. variáveis de ambiente
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
# (Supabase Dashboard > Project Settings > API)

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

## Estrutura

```
src/
  app/                 rotas (App Router)
  lib/
    env.ts             leitura das variáveis de ambiente
    supabase/
      client.ts        cliente para Client Components
      server.ts        cliente para Server Components / Actions
  types/
    database.ts        tipos espelhando o schema do Postgres
    index.ts           rótulos e regras de domínio (cartão padrão etc.)
supabase/
  schema.sql           schema completo + RLS (idempotente)
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
- **Local salvo lança o dia inteiro.** Você cadastra o `HCNI` uma vez dizendo
  que a ida são dois ônibus; no dia, escolhe o local e a data e o app grava os
  quatro trechos — a volta sai espelhada da ida (ordem invertida, origem e
  destino trocados, cliente `Residência`).
- **O valor vem sempre do preço vigente.** `place_legs.fare_group_id` aponta
  para o grupo em `fare_prices`, então um reajuste já entra nos próximos
  lançamentos sem precisar reeditar o local.

## Fases

- [x] **F1** Setup: projeto, Supabase clients, tipos, schema SQL + RLS
- [ ] **F2** Auth: login, cadastro, recuperação de senha, middleware
- [ ] **F3** Perfil: nome, superior e CRUD de preços com histórico
- [ ] **F4** Trips: lançamento, regra do cartão, simular volta, locais salvos
      (cadastrar e aplicar em uma data), tabela editável
- [ ] **F5** Filtro de período e cards de resumo
- [ ] **F6** Geração do PDF no formato do relatório
- [ ] **F7** Polish: validações, estados de carregamento, mobile, deploy
