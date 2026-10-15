---
phase: quick
plan: 261015-mbk
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/features/group/view/group-view.page.ts
  - src/app/features/group/view/group-view.page.html
  - src/app/features/group/view/group-view-reveal-link.spec.ts
autonomous: true
requirements: [DRAW-08, DRAW-09]

must_haves:
  truths:
    - "Um participante não-admin, em um grupo com status 'closed', vê na tela /group/:id um link 'Ver meu amigo secreto'"
    - "O link navega para /draw/:groupId/result (mesma rota que o admin já usa)"
    - "O link NÃO aparece enquanto o grupo está 'open' ou 'drawing'"
    - "O link NÃO aparece para quem não é participante do grupo (admin-only, não sorteado)"
  artifacts:
    - path: "src/app/features/group/view/group-view.page.html"
      provides: "Bloco @if com o link de revelação, dentro do hlmCardContent do primeiro card"
      contains: "'/draw', id(), 'result'"
    - path: "src/app/features/group/view/group-view.page.ts"
      provides: "computed podeVerResultado() + predicado puro exportado podeVerResultadoDoSorteio()"
      exports: ["GroupViewPage", "podeVerResultadoDoSorteio"]
    - path: "src/app/features/group/view/group-view-reveal-link.spec.ts"
      provides: "Testes do predicado de visibilidade (regra de negócio, ID32)"
  key_links:
    - from: "src/app/features/group/view/group-view.page.html"
      to: "/draw/:groupId/result"
      via: "routerLink no array ['/draw', id(), 'result']"
      pattern: "routerLink.*'/draw'"
    - from: "src/app/features/group/view/group-view.page.ts"
      to: "podeVerResultadoDoSorteio"
      via: "computed() delegando ao predicado puro testável"
      pattern: "podeVerResultadoDoSorteio\\("
---

<objective>
Adicionar na tela do participante (`/group/:id`) o link para a tela de revelação do par
(`/draw/:groupId/result`), visível quando o grupo está `closed` e o usuário logado é
participante do grupo.

**Purpose:** DRAW-08/DRAW-09 estão marcados como completos em REQUIREMENTS.md, mas são
*inalcançáveis pela UI* para um não-admin. O único link para `/draw/:groupId/result` no
projeto está em `manage-group.page.html:53`, atrás do `adminGuard`. O caminho real de um
participante é Dashboard → "Grupos que participo" → `/group/:id` → `group-view.page.html`,
que não tem nenhum link para a revelação em nenhum status. Backend, RLS, `memberGuard` e
`drawResultResolver` já foram verificados funcionando ao vivo com uma conta não-admin
(1 linha retornada, `giver_id` próprio, join correto no `display_name` do recebedor) —
isto é puramente um afordance de UI faltando.

**Output:** Link "Ver meu amigo secreto" em `group-view.page.html` + predicado puro de
visibilidade com teste unitário.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@src/app/features/group/view/group-view.page.ts
@src/app/features/group/view/group-view.page.html
@src/app/features/group/manage/manage-group.page.html

<decisao_de_escopo>
**O link é gatilhado em `status === 'closed'` E `meuParticipante() !== null`** (ambos),
não apenas no status.

Razão: `memberGuard` libera `/group/:id` para admin **OU** participante — ele checa só
`group !== null`, porque a RLS faz o OR das duas policies de SELECT (decisão registrada em
STATE.md, Phase 03-06). Então existe um caso real e alcançável nesta tela: o **admin que
não é participante do próprio grupo**. (Desde a plan 04-02 / D-01 o `create_group` insere
o admin como participante, logo grupos novos não têm esse caso — mas grupos criados antes
dessa migration têm, e nada impede o admin de se remover... exceto o D-04, que é UI-only,
com a policy de DELETE em `participant` intacta no banco. V2-02 item c.)

Para esse admin-não-participante, `getMyResult()` não encontra linha nenhuma em `draw` com
`giver_id` dele e o `drawResultResolver` devolve o estado `missing`. Mostrar um link que
leva garantidamente a uma mensagem de erro é a mesma má UX que a plan 03-04 já rejeitou
explicitamente ("Cards de grupos participados no dashboard não linkam para /manage — o
groupResolver redirecionaria o não-admin de volta, e um link que sempre rebate é péssima
UX"). Gatilhar em `meuParticipante()` mantém a consistência com essa decisão.

Bônus: `manage-group.page.html:51` já usa exatamente esta dupla condição
(`status === 'closed' && meuParticipante()`) para o mesmo link. A regra fica idêntica nas
duas telas — o que é o ponto do predicado puro compartilhável da Task 1.
</decisao_de_escopo>

<interfaces>
Já disponíveis em `GroupViewPage` (nenhum signal novo é necessário, nenhuma query extra):

```typescript
readonly id = input.required<string>();                       // param de rota, withComponentInputBinding
protected readonly grupo = this.groups.currentGroup;          // Signal<Group | null>
protected readonly meuParticipante = this.groups.meuParticipante; // Signal<Participant | null>
protected readonly souAdmin = computed(() => ...);
```

`Group.status` é `'open' | 'drawing' | 'closed'` (ver `src/app/core/models/group.model.ts`).

`meuParticipante` é um `computed` sobre `_participants()` populado por
`refreshParticipants(groupId)`, que o `effect` do construtor já dispara. Ou seja: no
momento em que a página renderiza com participantes carregados, o signal está correto —
nenhuma mudança de carregamento é necessária.

Shape do link existente a espelhar (`manage-group.page.html:51-56`):

```html
} @else if (grupoAtual().status === 'closed' && meuParticipante()) {
  <a hlmBtn variant="outline" size="sm" class="mt-3 w-fit"
     [routerLink]="['/draw', id(), 'result']">
    Ver meu amigo secreto
  </a>
}
```

`RouterLink` e `HlmButton` **já estão** no array `imports` de `GroupViewPage` (usados pelo
link "Gerenciar grupo") — nenhum import novo no componente.
</interfaces>

<nota_sobre_testes>
Não existe `group-view.page.spec.ts`, e **nenhum componente do projeto tem spec** — os 12
specs existentes cobrem guards, resolvers, services e funções puras (`draw-algorithm`,
`draw-error-messages`, `dias-ate-natal`). Introduzir o primeiro `TestBed` de componente
(com Spartan, `RouterLink`, `input.required` e `GroupService` mockado) para testar a
visibilidade de um `<a>` é desproporcional ao tamanho da mudança e foge do padrão da
suíte.

Em vez disso, a Task 1 extrai a condição como **predicado puro exportado** e a Task 2 o
testa com `describe/it/expect` do Vitest — o mesmo padrão de `draw-error-messages.spec.ts`.
É a regra de negócio ("quem pode ver o resultado") que fica coberta, que é exatamente o
que o ID32 pede, sem o custo de um harness de componente.
</nota_sobre_testes>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Predicado puro de visibilidade + computed podeVerResultado</name>
  <files>src/app/features/group/view/group-view.page.ts</files>
  <behavior>
    `podeVerResultadoDoSorteio(status, temParticipante)` retorna:
    - Test 1: `('closed', true)` → `true` (participante de grupo fechado vê o link)
    - Test 2: `('open', true)` → `false` (sorteio ainda não aconteceu)
    - Test 3: `('drawing', true)` → `false` (sorteio em andamento, pares podem não existir ainda)
    - Test 4: `('closed', false)` → `false` (admin não-participante: levaria ao estado `missing`)
    - Test 5: `(undefined, true)` → `false` (grupo ainda não carregado — não piscar o link)
  </behavior>
  <action>
Em `src/app/features/group/view/group-view.page.ts`:

1. **Antes** da declaração `@Component`, exportar o predicado puro:

```typescript
/**
 * DRAW-08/09: quem pode abrir `/draw/:groupId/result`.
 *
 * Duas condições, não uma: o grupo precisa estar `closed` (os pares só existem
 * depois do sorteio) E o usuário precisa ser participante. A segunda existe porque
 * o `memberGuard` libera `/group/:id` para admin OU participante, então um admin
 * que não participa do próprio grupo chega aqui — e para ele o `drawResultResolver`
 * devolve `missing`. Link que sempre rebate é péssima UX (mesma razão de os cards do
 * dashboard não linkarem para /manage).
 *
 * Função pura e exportada para ser testável sem TestBed, no padrão dos demais specs
 * do projeto (RA8-ID32).
 */
export function podeVerResultadoDoSorteio(
  status: GroupStatus | undefined,
  temParticipante: boolean,
): boolean {
  return status === 'closed' && temParticipante;
}
```

2. Importar o tipo do status a partir de `../../../core/models/group.model`. **Verifique
   antes** como o status é tipado nesse arquivo:
   - Se existe um alias exportado (ex. `GroupStatus`), importe-o e use na assinatura.
   - Se o status é um literal inline dentro de `Group` (ex.
     `status: 'open' | 'drawing' | 'closed'`), use `Group['status']` na assinatura em vez
     de criar um alias novo — não introduza um tipo novo no model só por isto.

3. Dentro da classe `GroupViewPage`, logo abaixo de `souAdmin`, adicionar o computed que
   liga o predicado aos signals existentes:

```typescript
  /** DRAW-08/09: afordance de revelação para o participante (ver predicado acima). */
  protected readonly podeVerResultado = computed(() =>
    podeVerResultadoDoSorteio(this.grupo()?.status, this.meuParticipante() !== null),
  );
```

`computed` já está importado. Nenhum signal novo, nenhuma query nova, nenhum import de
`RouterLink`/`HlmButton` novo (ambos já estão no array `imports`).

NÃO alterar o JSDoc de classe existente nem o `effect` do construtor.
  </action>
  <verify>
    <automated>cd /home/pedro-zampier/Documentos/ULTIMOSEMESTRE/web-3/amigo-secreto && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -5; grep -n "podeVerResultadoDoSorteio\|podeVerResultado = computed" src/app/features/group/view/group-view.page.ts</automated>
  </verify>
  <done>`podeVerResultadoDoSorteio` exportado do arquivo, `podeVerResultado` computed na classe, type-check sem erros novos.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Spec do predicado de visibilidade</name>
  <files>src/app/features/group/view/group-view-reveal-link.spec.ts</files>
  <behavior>
    Os 5 casos listados no `<behavior>` da Task 1, cada um como um `it()` em PT-BR
    descrevendo a regra de negócio (não o mecanismo).
  </behavior>
  <action>
Criar `src/app/features/group/view/group-view-reveal-link.spec.ts` no padrão de
`src/app/core/draw-error-messages.spec.ts` (import explícito de `describe, it, expect`
do `vitest`, nomes de teste em PT-BR):

```typescript
import { describe, it, expect } from 'vitest';
import { podeVerResultadoDoSorteio } from './group-view.page';

describe('podeVerResultadoDoSorteio', () => {
  it('libera o link para um participante de grupo já sorteado', () => {
    expect(podeVerResultadoDoSorteio('closed', true)).toBe(true);
  });

  it('esconde o link enquanto o grupo está aberto', () => {
    expect(podeVerResultadoDoSorteio('open', true)).toBe(false);
  });

  it('esconde o link enquanto o sorteio está em andamento', () => {
    expect(podeVerResultadoDoSorteio('drawing', true)).toBe(false);
  });

  it('esconde o link de quem não é participante, mesmo com o grupo fechado', () => {
    // O admin que não participa do próprio grupo: o memberGuard o deixa entrar em
    // /group/:id, mas o drawResultResolver devolveria `missing` para ele.
    expect(podeVerResultadoDoSorteio('closed', false)).toBe(false);
  });

  it('esconde o link enquanto o grupo ainda não carregou', () => {
    expect(podeVerResultadoDoSorteio(undefined, true)).toBe(false);
  });
});
```

Se a Task 1 usou `Group['status']` em vez de um alias `GroupStatus`, os literais acima
continuam válidos sem cast — não adicione `as` nenhum.
  </action>
  <verify>
    <automated>cd /home/pedro-zampier/Documentos/ULTIMOSEMESTRE/web-3/amigo-secreto && npx ng test --watch=false --include='**/group-view-reveal-link.spec.ts'</automated>
  </verify>
  <done>5 testes passando (o `--include` com glob é a forma correta de alvejar um spec único neste projeto — `--run` é rejeitado pelo builder Vitest do `ng test`, conforme STATE.md Phase 02-01).</done>
</task>

<task type="auto">
  <name>Task 3: Link no template + verificação da suíte completa</name>
  <files>src/app/features/group/view/group-view.page.html</files>
  <action>
Em `src/app/features/group/view/group-view.page.html`, dentro do `<div hlmCardContent>` do
primeiro card (linhas 13-19, que hoje contém apenas o `@if (souAdmin())` com o link
"Gerenciar grupo"), adicionar o link de revelação.

Resultado esperado desse bloco:

```html
    <div hlmCardContent class="flex flex-col items-start gap-2">
      @if (souAdmin()) {
        <a hlmBtn variant="outline" size="sm" [routerLink]="['/group', id(), 'manage']">
          Gerenciar grupo
        </a>
      }
      <!-- DRAW-08/09: o caminho do participante até o próprio par. Antes desta
           mudança o único link para esta rota vivia em manage-group.page.html,
           atrás do adminGuard — a revelação era inalcançável para um não-admin. -->
      @if (podeVerResultado()) {
        <a hlmBtn size="sm" [routerLink]="['/draw', id(), 'result']">
          Ver meu amigo secreto
        </a>
      }
    </div>
```

Pontos de atenção:
- `@if`, nunca `*ngIf` (CLAUDE.md / RA2-ID5).
- O `class="flex flex-col items-start gap-2"` no `hlmCardContent` existe para os dois
  links não colarem um no outro quando o admin também é participante (caso exercitado no
  UAT da fase). Mobile-first: empilhado em qualquer largura, legível a partir de 320px.
- Variant: este link é a **ação principal** do participante nesta tela, então vai sem
  `variant="outline"` (botão sólido padrão), enquanto "Gerenciar grupo" permanece
  `outline` como ação secundária. Em `manage-group.page.html` a hierarquia é invertida
  (lá o link é secundário, a gestão é o assunto da página) — a divergência de variant
  entre as duas telas é intencional.
- Texto exatamente "Ver meu amigo secreto", igual a `manage-group.page.html:54` — mesma
  ação, mesmo rótulo, no tom de "Gerenciar grupo" / "Salvar lista".
- `<a>` com `routerLink`, não `<button>` — é navegação, e precisa funcionar com
  ctrl-click / leitor de tela (WCAG 2.1 AA).
  </action>
  <verify>
    <automated>cd /home/pedro-zampier/Documentos/ULTIMOSEMESTRE/web-3/amigo-secreto && npx ng build && npx eslint src --max-warnings=0 && npx ng test --watch=false</automated>
  </verify>
  <done>Build exit 0, eslint exit 0 (incluindo a regra `prefer-control-flow`), suíte completa verde (64 testes: os 59 pré-existentes + os 5 novos). `grep -c "'/draw'" src/app/features/group/view/group-view.page.html` retorna 1.</done>
</task>

</tasks>

<verification>
1. `npx ng build` — exit 0 (o strict template checking do Angular pega `podeVerResultado`
   não existindo ou tipado errado).
2. `npx eslint src --max-warnings=0` — exit 0; confirma `@if` e não `*ngIf`.
3. `npx ng test --watch=false` — suíte completa verde, 64 testes.
4. `grep -n "'/draw'" src/app/features/group/view/group-view.page.html` — 1 ocorrência,
   fecha o gap que o `grep -rn "draw/" src/app` havia revelado (antes: só
   `manage-group.page.html:53`).
</verification>

<success_criteria>
- Um participante não-admin em `/group/:id` de um grupo `closed` vê e pode clicar em
  "Ver meu amigo secreto", chegando a `/draw/:groupId/result`.
- O link não é renderizado em `open` / `drawing`, nem para um admin não-participante.
- A regra de visibilidade está coberta por 5 testes unitários sem TestBed.
- Build, lint e suíte completa verdes; DRAW-08/DRAW-09 passam a ser alcançáveis pela UI
  para o papel a que se destinam.
</success_criteria>

<output>
Create `.planning/quick/261015-mbk-adicionar-link-para-a-tela-de-revelacao-/261015-mbk-SUMMARY.md`
</output>
