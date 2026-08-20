# Guia do projeto

App que substitui a planilha de reembolso de passagem da Tecnoarte. O
funcionário lança os trechos de ônibus e barca, escolhe o período e baixa o
PDF que o financeiro já conhece.

## Comandos

```bash
npm run dev        # desenvolvimento
npm test           # 117 testes, node:test embutido, ~1s
npm run build      # produção; roda ESLint e TypeScript junto
```

Rodar `npm test` e `npm run build` antes de qualquer push. O CI roda os dois.

## O que não pode quebrar

**A regra do espelho** (`src/lib/trips.ts`). A volta é derivada da ida: ordem
invertida, origem trocada com destino, cliente vira `Residência`. É o que
poupa metade da digitação e o que os testes protegem primeiro. Mexeu ali,
rode `npm test`.

**A unidade de lançamento é o dia, não o trecho.** O formulário recebe a ida
inteira — as duas ou três conduções — e só então espelha. Aceitar um trecho de
cada vez com a caixa "voltou" marcada produz viagens fechadas em si (vai e
volta do ônibus, vai e volta da barca) em vez de um percurso contínuo. Tem
teste de regressão em `tests/trips.test.ts`.

**Cartão é escolha, não consequência.** Ônibus sugere JAÉ e barca sugere RIO
CARD, mas o campo é editável: a linha 143C é ônibus paga no RIO CARD. Nunca
derive o cartão do transporte na hora de salvar.

**Reajuste não sobrescreve preço.** Editar o valor de uma passagem desativa o
registro atual e cria outro no mesmo `group_id`. O trecho já lançado guarda
sua própria cópia do valor, então relatório fechado não muda sozinho.

**Toda consulta filtra por `user_id`, mesmo com RLS.** A RLS é a defesa real,
mas é uma camada só: uma política removida por engano transformaria
`delete().eq('date', date)` em "apaga o dia de todo mundo". Com o filtro
explícito o pior caso vira lista vazia. `getSuggestions` exige o id na
assinatura porque o texto dela vai direto para o autocomplete.

**Falha de banco nunca vira lista vazia.** `data ?? []` transforma erro em
"nenhum trecho lançado", e a pessoa conclui que o app perdeu o trabalho dela.
Toda leitura passa por `primeiraFalha` (`src/lib/query.ts`) e a tela diz o que
houve; coluna faltando manda rodar a migração, não recarregar a página.

**Período é livre.** Quinzena é só o padrão de quem nunca escolheu; o último
período escolhido fica num cookie.

## Decisões que parecem estranhas mas têm motivo

| Decisão | Motivo |
| --- | --- |
| Nenhum componente de cliente fala com o Supabase | Permite o cookie de sessão ser `httpOnly`. Um cliente de browser quebraria isso |
| `trips.value` é cópia, não referência | Reajuste futuro não pode alterar relatório já entregue |
| Ordem dos trechos sai em JS, não no `order by` | Pedir a coluna ao banco faz a consulta inteira falhar onde ela não existe; nenhuma consulta é paginada, então ordenar depois dá o mesmo resultado |
| `trips.leg_order` existe apesar de haver `created_at` | `now()` é o horário da transação: os quatro trechos de um dia nascem com `created_at` idêntico e a ordem da ida e da volta se perderia |
| Identidade dos trechos no formulário é o índice | UUID gerado na renderização diverge entre servidor e cliente e quebra a hidratação |
| Data do formulário é campo controlado | `form.reset()` a devolveria para hoje no meio de um lançamento em sequência |
| `todayISO()` fixa o fuso em `America/Sao_Paulo` | O servidor roda em UTC e viraria o dia depois das 21h |
| `parseAmount` recusa `1.234` | Milhar em português, decimal em inglês; chutar dinheiro é pior que pedir de novo |
| Totais arredondados só no fim | Somar centavos em float acumula `211.09999999999994` |
| `safeRedirectPath` recusa contrabarra | `/\evil.com` parece interno mas o navegador lê como `//evil.com` |
| PDF usa `pdf-lib` | JavaScript puro: sem binário nem arquivo de fonte para empacotar na Vercel |

## Estilo

- Comentários em português, explicando **por quê**, não o quê
- Server Components por padrão; `'use client'` só com estado ou evento
- Só Tailwind, sem biblioteca de UI. A cor carrega informação: verde da marca
  para barca e RIO CARD, ocre para ônibus e JAÉ, carvão para sistema e ações
- Validação devolve todos os erros de uma vez, presos ao campo

## Segredos

Chave nenhuma no repositório, nem no README, nem em comentário. As variáveis
vivem no `.env.local` (ignorado pelo Git) e nos Environment Variables da
Vercel. O e-mail do usuário não vai para o HTML — veja `maskEmail`.
