# Itens adiados — Fase 3

## Não existe tela para o participante não-admin (WISH-01, WISH-02 bloqueados)

**Descoberto em:** 2026-10-15, na verificação manual do checkpoint da plan 03-05.

**Sintoma:** um usuário que entra num grupo por convite volta ao dashboard, vê o grupo em
"Grupos que participo", e **não tem para onde ir**. Clicar não leva a lugar nenhum útil:
a única rota de grupo é `/group/:id/manage`, cujo `groupResolver` barra quem não é admin
e redireciona para `/dashboard`.

**Isto não é um defeito do resolver** — ele funciona exatamente como a plan 03-03
especificou (desvio D-08, checagem de admin embutida). É uma lacuna de escopo: a Fase 3
planejou três telas (`create`, `manage`, `join`) e nenhuma delas serve o participante puro.

**Consequência nos requisitos:** a textarea de wishlist vive dentro de
`manage-group.page.html`, que só o admin consegue abrir. Logo:

- **WISH-01** ("participante cadastra a própria lista de desejos") — **desmarcado**
- **WISH-02** ("participante edita a própria lista a qualquer momento") — **desmarcado**

Um admin consegue usar a wishlist (ele abre a tela de gestão e, se também for participante
do próprio grupo, o `meuParticipante()` resolve). Um participante que não é admin, não.

**WISH-03 permanece marcado:** "participante não consegue editar a lista de outra pessoa"
é garantido pela policy de UPDATE em `participant` (`user_id = (select auth.uid())`), que
vale no banco independentemente de qualquer tela existir.

**Decisão:** registrado como lacuna em vez de corrigido. Inventar uma tela nova no
fechamento da fase, sem UI-SPEC e sem plan, trocaria uma lacuna visível por código não
planejado. O verificador da fase vai apontar WISH-01/02 de qualquer forma, e o caminho
natural é uma fase de correção (3.1) com plan própria.

**Opções avaliadas para a correção futura:**

1. **Afrouxar o `groupResolver`** para deixar o participante abrir `/group/:id/manage`,
   escondendo no template o que é exclusivo do admin (`@if (souAdmin())` em torno de
   remover-participante e do link de convite). Mais barato, reaproveita a tela existente.
   Risco: a tela passa a ter dois papéis e o `@if` vira a única barreira visual — a
   proteção real continua nas policies, mas a tela fica mais fácil de quebrar por engano.
2. **Rota `/group/:id` com tela própria de participante** — nome do grupo, lista de
   colegas, e a wishlist do usuário. Conceitualmente mais limpo, separa os dois papéis em
   dois componentes. Mais caro.

**Status:** Não corrigido. WISH-01 e WISH-02 desmarcados em `REQUIREMENTS.md`.

---

## `check:no-secrets` falha com falso positivo (herdado da Fase 1)

O script `! grep -rEi 'service_role|sb_secret_' src/ && ! grep -rEi ... dist/` falha na
parte do `dist/`: `@supabase/auth-js` contém o literal `"sb_secret_"` no próprio código,
porque a biblioteca testa `key.startsWith("sb_secret_")` para detectar o formato da chave.

Verificado em 2026-10-15: a única ocorrência em `dist/` é o prefixo nu, sem nenhuma chave
depois; `src/` tem zero ocorrências; `environment.ts` só tem a chave publicável.

**Por que importa mais do que parece:** o gate falha em toda build, então todo agente
aprende a ignorá-lo — e um check que é sempre vermelho deixa de proteger contra o
vazamento real que ele existe para pegar.

**Correção sugerida:** restringir o grep do `dist/` a chaves de verdade
(`sb_secret_[A-Za-z0-9]`) em vez do prefixo isolado, ou excluir os chunks de vendor.

**Status:** Já rastreado em `.planning/phases/02-autentica-o-end-to-end/deferred-items.md`.
Repetido aqui porque reapareceu nos gates desta fase.
