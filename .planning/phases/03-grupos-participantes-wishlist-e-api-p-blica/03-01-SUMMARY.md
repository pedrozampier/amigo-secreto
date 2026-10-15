---
phase: 03-grupos-participantes-wishlist-e-api-p-blica
plan: 01
subsystem: database
tags: [supabase, rls, security-definer, rpc, postgres, vitest, convite]

# Dependency graph
requires:
  - phase: 01-fundacao-scaffold-banco-rls
    provides: migrations 0001_schema.sql (tabelas group/participant), 0002_private_helpers.sql (padrão SECURITY DEFINER + search_path=''), 0003_rls_policies.sql (policies que bloqueiam leitura/escrita direta para não-membros)
provides:
  - "public.join_group_by_token(text) e public.preview_group_by_token(text) — RPCs SECURITY DEFINER no schema public que destravam a entrada por convite sem reabrir a RLS de public.group"
  - "Códigos estáveis em inglês (OK/INVALID_TOKEN/GROUP_CLOSED/ALREADY_MEMBER) devolvidos pelo RPC de join, incluindo tradução de unique_violation (23505) para ALREADY_MEMBER"
  - "src/app/core/join-error-messages.ts — tradução PT-BR desses códigos com fallback genérico, mesmo padrão de auth-error-messages.ts"
  - "Evidência de verificação end-to-end contra o banco de produção real em docs/db-rls-verification.md, seção 'Verificação da migration 0004 (Fase 3)'"
affects: [03-05-telas-de-convite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RPCs de regra de negócio (não apenas helpers de policy) também podem ser SECURITY DEFINER, desde que vivam no schema public (exposto pela Data API) e revalidem tudo no corpo da função em vez de confiar no chamador"
    - "Código de erro estável em inglês no banco, tradução PT-BR isolada em um módulo Angular dedicado (join-error-messages.ts), espelhando auth-error-messages.ts"
    - "exception when unique_violation dentro do PL/pgSQL para converter uma corrida de concorrência real (constraint UNIQUE) no mesmo código estável que a checagem antecipada, em vez de vazar 23505 para o cliente"

key-files:
  created:
    - supabase/migrations/0004_group_join_rpcs.sql
    - src/app/core/join-error-messages.ts
    - src/app/core/join-error-messages.spec.ts
  modified:
    - docs/db-rls-verification.md
    - .gitignore

key-decisions:
  - "preview_group_by_token devolve exclusivamente (name, status) — nunca contagem de participantes nem qualquer dado sobre quem está no grupo, para que o token de convite não se torne um vazamento de identidade (D-02)"
  - "0004 não alterou nenhuma policy da 0003; as duas RPCs somam uma via de acesso validada por cima das policies existentes, não as substituem"
  - "Verificação da Task 3 executada pelo orquestrador via npx supabase db query --linked contra o projeto de produção real (ccruvfblgdvnjxenezuh), não pelo usuário no SQL Editor como o roteiro da plan previa"
  - "supabase/.temp/ (cache de runtime da CLI linkada, contém pooler URL) adicionado ao .gitignore — nunca deveria ser versionado"

requirements-completed: []

# Metrics
duration: 36min
completed: 2026-10-15
---

# Phase 03 Plan 01: RPCs de Convite por Token (SECURITY DEFINER) Summary

**Dois RPCs `SECURITY DEFINER` (`join_group_by_token`, `preview_group_by_token`) destravam a entrada por convite sem reabrir a RLS de `public.group`, com tradução PT-BR dos códigos de erro e evidência de verificação executada contra o banco de produção real.**

## Performance

- **Duration:** 36 min (09:25 -> 10:01, com pausa para checkpoint humano/orquestrador entre a Task 2 e a Task 3)
- **Started:** 2026-10-15T09:25:00Z
- **Completed:** 2026-10-15T10:01:50Z
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files modified:** 5 (3 criados, 2 modificados)

## Accomplishments
- `supabase/migrations/0004_group_join_rpcs.sql` com `public.preview_group_by_token(text)` e `public.join_group_by_token(text)`, ambas `SECURITY DEFINER` + `set search_path = ''`, aplicadas e confirmadas no banco de produção real (`prosecdef = true`, `proconfig = search_path=""` via consulta direta a `pg_proc`)
- `preview_group_by_token` comprovadamente restrita a `(name, status)` — nenhum dado de participantes exposto
- `join_group_by_token` devolve os 4 códigos estáveis em inglês (`OK`, `INVALID_TOKEN`, `GROUP_CLOSED`, `ALREADY_MEMBER`), incluindo a conversão de uma corrida real de `unique_violation` (23505) para o mesmo `ALREADY_MEMBER` da checagem antecipada
- `src/app/core/join-error-messages.ts` + spec (6 casos, TDD RED→GREEN) traduzindo esses códigos para PT-BR com fallback genérico
- Verificação end-to-end com 3 usuários reais contra o banco de produção, provando o critério central: um não-membro continua recebendo 0 linhas num `SELECT` direto em `public.group`, mas atravessa via RPC — a RLS da 0003 nunca foi reaberta

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0004 com os dois RPCs SECURITY DEFINER do convite** - `89ceb32` (feat)
2. **Task 2: Mapa de tradução PT-BR dos códigos do join + spec** - `55f2a88` (test, RED), `85f87b4` (feat, GREEN)
3. **Task 3: Checkpoint — validar a 0004 no banco real com dois usuários** - `5d7a0ca` (docs, evidência registrada)

**Plan metadata:** (final commit, ver abaixo)

## Files Created/Modified
- `supabase/migrations/0004_group_join_rpcs.sql` - Os dois RPCs `SECURITY DEFINER` do convite, no schema `public`
- `src/app/core/join-error-messages.ts` - `translateJoinError` + `GENERIC_JOIN_ERROR`, mesmo padrão de `auth-error-messages.ts`
- `src/app/core/join-error-messages.spec.ts` - 6 casos cobrindo os 3 códigos conhecidos + fallback genérico (unknown/null/undefined/OK)
- `docs/db-rls-verification.md` - Nova seção `## Verificação da migration 0004 (Fase 3)` com as 8 saídas reais do banco de produção e resumo por requisito (GRP-06/07/08)
- `.gitignore` - Ignora `supabase/.temp/` (cache de runtime da CLI linkada)

## Decisions Made
- `preview_group_by_token` devolve só `(name, status)` — decisão de design já fixada na própria plan (D-02), confirmada sem desvio na implementação
- Nenhuma policy da `0003_rls_policies.sql` foi tocada; `git diff --stat` do arquivo permanece vazio durante toda a execução
- A verificação da Task 3 foi conduzida pelo orquestrador via CLI linkada contra produção, não pelo usuário manualmente no SQL Editor — ver Deviations

## Deviations from Plan

### Auto-fixed Issues

Nenhum desvio de código via Regras 1-3 nesta plan — a migration e o mapa de tradução foram implementados exatamente como especificado e passaram em todas as verificações automatizadas sem necessidade de correção.

### Outros desvios (processo / ferramental)

**1. Falso negativo no comando de verificação automatizado da Task 1**

- **Encontrado durante:** Verificação da Task 1
- **Sintoma:** `grep -c "set search_path = ''" supabase/migrations/0004_group_join_rpcs.sql | grep -q '^2$'` devolve exit 1, embora as duas funções realmente tenham `security definer` + `set search_path = ''` no corpo.
- **Causa:** o próprio conteúdo prescrito pela plan contém uma TERCEIRA ocorrência textual da string `set search_path = ''` dentro de um comentário explicativo (linha 21 do bloco de ação da plan: "`set search_path = ''` + nomes schema-qualificados continuam OBRIGATÓRIOS"), fazendo o `grep -c` contar 3 em vez de 2.
- **Confirmação de que a migration está correta, não o script:** inspeção manual do arquivo confirma 2 declarações funcionais `set search_path = ''` (uma por função) mais 1 ocorrência em comentário; e a consulta real a `pg_proc` no Passo 1 da verificação da Task 3 confirma `prosecdef = true` e `proconfig = search_path=""` para as duas funções no banco de produção. A migration está certa; o script de verificação da própria plan é que tem o falso negativo.
- **Ação tomada:** nenhuma alteração de código. A migration foi aplicada e verificada como escrita. Esta nota existe apenas para que o falso negativo não seja confundido com um defeito real caso o comando seja rerodado.
- **Arquivos:** nenhum modificado por esta observação (apenas documentada aqui)
- **Commit:** n/a (nenhuma mudança de código associada)

**2. Task 3 executada pelo orquestrador contra produção, não pelo usuário no SQL Editor**

- **Encontrado durante:** Checkpoint da Task 3
- **Plano original:** a plan previa que o usuário executaria manualmente os 8 passos do roteiro `<how-to-verify>` no SQL Editor do painel Supabase, alternando entre duas sessões autenticadas.
- **O que de fato ocorreu:** o orquestrador linkou a CLI do Supabase ao projeto remoto real (`project ref ccruvfblgdvnjxenezuh`) e executou os 8 passos diretamente via `npx supabase db query --linked`, usando três usuários já existentes em `auth.users` (A, B e um terceiro C para o cenário de grupo fechado). O usuário aprovou o resultado ("APROVADO") depois de revisar as saídas reais.
- **Descoberta relevante registrada:** a migration `0004` já estava aplicada no banco remoto ANTES desta sessão de verificação (assim como as `0001`-`0003`), aplicada manualmente via SQL Editor em algum momento anterior. A tabela `supabase_migrations.schema_migrations` não existe no projeto remoto — o histórico de migrations da CLI está vazio mesmo com as 4 migrations de fato aplicadas e funcionando. Nenhum `supabase db push` foi executado nesta sessão. Isso é dívida de processo, documentada em detalhe na nova seção de `docs/db-rls-verification.md` ("Itens não capturados / dívida de processo"), não um bloqueio funcional — o schema e as RLS policies reais foram confirmados via `pg_proc` e via execução efetiva das funções.
- **Arquivos:** `docs/db-rls-verification.md`, `.gitignore`
- **Commit:** `5d7a0ca`

---

**Total deviations:** 0 de código (Regras 1-3); 2 de processo/ferramental documentadas acima.
**Impact on plan:** Nenhum impacto na correção da migration ou do mapa de tradução — ambos entregues exatamente como especificado. O método de verificação mudou (CLI linkada contra produção em vez de SQL Editor manual), mas o resultado verificado é equivalente ou mais forte (saídas reais de produção, com um terceiro usuário adicional testando o cenário de grupo fechado).

## Issues Encountered
Nenhum além dos dois itens documentados em Deviations.

## User Setup Required

None - nenhuma configuração externa adicional requerida por esta plan. A CLI do Supabase já estava linkada ao projeto real durante a verificação da Task 3.

## Next Phase Readiness
- `public.join_group_by_token` e `public.preview_group_by_token` estão aplicadas e verificadas em produção; a plan 03-05 (telas de convite) pode consumi-las via `supabase.rpc()` sem trabalho adicional de banco
- `translateJoinError`/`GENERIC_JOIN_ERROR` estão prontos para as telas consumirem diretamente
- GRP-06/GRP-07/GRP-08: a CAMADA DE BANCO desses requisitos está completa e verificada; a camada de UI (telas de convite) ainda não existe e será entregue na plan 03-05 — ver REQUIREMENTS.md para o estado exato de cada um
- Dívida de processo sobre o histórico de migrations da CLI (ver `docs/db-rls-verification.md`) deve ser considerada antes de uma migration `0005` ser criada, para evitar que a divergência entre CLI e banco real cresça mais

---
*Phase: 03-grupos-participantes-wishlist-e-api-p-blica*
*Completed: 2026-10-15*

## Self-Check: PASSED

Todos os 6 arquivos criados/modificados verificados presentes em disco; todos os 4 commits
de task (`89ceb32`, `55f2a88`, `85f87b4`, `5d7a0ca`) verificados presentes no histórico git.
