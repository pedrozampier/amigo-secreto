# Phase 5: PWA, Acessibilidade e Entrega - Context

**Gathered:** 2026-10-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Tornar o aplicativo **já funcionalmente completo** (Fases 1–4) em um produto entregável:
instalável como PWA, responsivo a partir de 320px, acessível em WCAG 2.1 AA, e com toda a
documentação exigida pela rubrica de processo consolidada e publicamente verificável.

**Esta fase não adiciona nenhuma capacidade funcional nova.** Nenhuma tela nova, nenhuma
regra de negócio nova, nenhuma tabela ou policy nova no banco. O que ela faz é: embrulhar
(PWA), polir (acessibilidade e identidade visual) e documentar (README, `.spec.md`,
protótipo).

Requisitos cobertos: **UI-03, UI-04, UI-05, UI-06, UI-07, ENG-07, ENG-09**.
Indicadores da rubrica em jogo: **RA1-ID1, RA1-ID2, RA1-ID3, RA2-ID4, RA3-ID12,
RA8-ID29, RA8-ID30**.

</domain>

<decisions>
## Implementation Decisions

### Estado real encontrado no scout (base factual — não é suposição)

> **Leitura obrigatória para quem for planejar.** O ponto de partida desta fase foi
> verificado em disco, não inferido:
>
> | Item | Estado em 2026-10-15 |
> |:---|:---|
> | `public/` | **somente `favicon.ico`** — zero ícones PWA, zero manifest |
> | `@angular/service-worker` | **não instalado** (ausente de `package.json`) |
> | `src/index.html` | `lang="en"`, `<title>AmigoSecreto</title>`, **sem** link de manifest, **sem** `theme-color` |
> | `src/styles.css` | paleta **Spartan default intocada** (todos os tokens com croma 0 — `--primary: oklch(0.205 0 0)`) |
> | `:root.dark` | bloco completo (~25 linhas) presente, mas **nada no app adiciona a classe `.dark`** — código morto |
> | Acessibilidade | `role="alert"` em 6 telas, `role="status"` em 1, 2 `aria-label` — **sem** skip link, **sem** `aria-live` em carregamento |
> | `--ring` (foco) | `oklch(0.708 0 0)` cinza — **suspeito de reprovar** o contraste 3:1 do WCAG 1.4.11 |
> | Layout | **tudo** em `max-w-md`, inclusive no desktop |
> | `README.md` | **2 linhas** |
> | `.spec.md` | **não existe** |
> | Protótipo Figma | **não existe**; MCP do Figma documentado em `docs/sdd.md` §1.2 |
> | `@defer` | **já gasto 2×** (dashboard `on viewport`, draw-result `on interaction`) — ID8 coberto, não forçar um terceiro |

### PWA e comportamento offline (UI-03, UI-04, UI-05 · ID3, ID12)

- **D-01:** Usar **`ng add @angular/pwa`** completo, instalando `@angular/service-worker`
  na linha **21** (mesma versão do resto do Angular — sem risco de peer conflict, e o
  projeto já sofreu com peers na Fase 1). O schematic gera `manifest.webmanifest`,
  `ngsw-config.json`, os ícones e o registro do service worker de uma vez.
  Razão: é o único caminho em que o Lighthouse marca *Installable* sem ressalva, que é
  **literalmente o critério 1 do ROADMAP** ("confirmado pelo Lighthouse/DevTools sem erros
  de manifest"). Sem service worker, o app não abre offline de forma alguma.
  **OBRIGATÓRIO no mesmo commit:** adicionar `@angular/service-worker` à tabela §2 de
  `docs/sdd.md` — a regra de "nenhuma dependência fora da tabela" é explícita no CLAUDE.md
  e no próprio SDD.
  Rejeitado: manifest escrito à mão sem service worker (zero dependência nova, mas o
  "estado offline" ficaria limitado a detectar a queda com a aba já aberta, e o Lighthouse
  não dá PWA instalável pleno).

- **D-02:** O estado offline aparece como **banner global fixo no topo**, dentro de
  `src/app/features/shell/authenticated-layout.page.html`, **acima do `<header>`** já
  existente. Texto em PT-BR do tipo "Você está offline. Algumas ações podem falhar.",
  aparecendo quando a conexão cai e sumindo sozinho quando volta.
  Razão: visível em qualquer tela sem duplicar código, e **não desmonta a tela atual** —
  quem está lendo o par que acabou de revelar continua lendo.
  Rejeitado: tela cheia de "Sem conexão" (mais dramática de demonstrar, mas destrói o
  contexto e obriga a renavegar) e banner + desabilitar botões de escrita (mais correto
  como produto, mas espalharia a leitura do signal por várias telas, inflando a fase).

- **D-03:** O status de conexão vive num **`ConnectivityService`**
  (`@Injectable({providedIn:'root'})`, consumido via `inject()`), com **um signal privado
  `_online = signal(navigator.onLine)`** exposto readonly, e os listeners de `'online'` /
  `'offline'` do `window` escrevendo nele.
  **É aqui que o `effect()` do RA3-ID12 é demonstrado** — e de forma honesta: reage à
  mudança do signal para produzir um efeito colateral real, não decorativo. O
  `REQUIREMENTS.md` já mapeia ID12 → UI-05 exatamente assim (linha 127).
  Segue o padrão D-04 da Fase 2 (um signal escrito, o resto `computed()`) e é mockável em
  `.spec.ts`.
  Rejeitado: `toSignal()` sobre `fromEvent(window, 'online')` — demonstraria ID24 pela
  segunda vez, mas ID24 **já está entregue** pelo `HolidayService` (API-04), e introduziria
  RxJS onde um listener resolve. Rejeitado também: signal direto no componente de layout
  (não mockável, não reutilizável).
  **Atenção ao gate mecânico:** `npm run check:no-rxjs-state` falha se aparecer
  `BehaviorSubject` ou `new Subject` em `src/app`.

- **D-04:** Os ícones do PWA são **gerados por um script commitado em `scripts/`** a partir
  de um SVG próprio (tema de presente/laço com a identidade do UTF-Secret), não os
  placeholders do Angular.
  Razão: entregar o app com o **logo do Angular** como ícone é fraco numa banca que avalia
  usabilidade (ID1/ID3); gerar por script mantém determinístico, versionado e alinhado à
  paleta de D-05.
  **Ponto para o researcher:** verificar se a conversão SVG→PNG é possível **sem
  dependência nova** (o projeto já tem `jsdom`); se exigir algo como `sharp`, isso é
  `devDependency` nova e **obriga atualizar `docs/sdd.md` §2 primeiro** — avaliar e
  justificar a escolha.
  Rejeitado: usar os 8 PNGs do schematic como estão; e você fornecer os ícones à mão
  (melhor visual, mas vira bloqueio humano no meio da fase).

- **D-05 (manifest):** `theme_color` **verde-pinho** e `background_color` **claro**, ambos
  em **hexadecimal literal**, idênticos no `manifest.webmanifest` e no
  `<meta name="theme-color">` do `index.html`.
  **Limitação real a documentar no README:** o manifest **não aceita `oklch()` nem
  `var(--primary)`** — os valores são hex fixos e precisam ser **sincronizados à mão** com
  `styles.css`. Documentar, não esconder.
  `background_color` é o que pinta a **splash screen** do PWA — errar isso produz um flash
  branco feio na abertura, que é justamente o que ID3 chama de "splash screen".
  Rejeitado: dois `<meta theme-color>` com media query por tema (mais fiel, mas duplica o
  valor em três lugares para um ganho que a banca não nota).

### Design System e identidade visual (ID4, ID29)

- **D-06:** O app adota uma **paleta natalina sóbria**: `--primary` vira um **verde-pinho
  escuro**, `--destructive` mantém o vermelho, e um acento dourado/vermelho aparece em
  pontos de destaque (cartão de revelação, contador de Natal). **O resto da UI continua
  neutro** — temático sem virar cartão de Natal.
  Razão: ID4 pede framework CSS "incorporado **e customizado**", e a paleta hoje é o cinza
  default do Spartan com **croma literalmente zero** em todos os tokens — difícil de
  defender como customização. Sobrescrever poucas variáveis no `:root` que já existe dá
  mudança pequena, efeito visível e fácil de documentar.
  Rejeitado: cor de marca não-natalina (atemporal, mas perde a amarração com o contador de
  Natal da BrasilAPI já no dashboard) e customizar só tipografia/raio (leitura mais fraca
  de ID4 — num print ninguém vê diferença do default).

- **D-07:** O bloco `:root.dark` **deixa de ser código morto**: o seletor passa a
  **`@media (prefers-color-scheme: dark)`**, de forma que o tema escuro siga a preferência
  do sistema operacional — **sem toggle, sem signal, sem localStorage**.
  Razão: o bloco já está escrito (jogar fora é desperdício), o custo é uma linha de CSS, e
  respeitar preferência declarada do usuário ajuda na auditoria.
  **Consequência direta e obrigatória:** a auditoria de contraste de D-10 precisa cobrir
  **os dois temas**, e a paleta de D-06 precisa das duas versões.
  Rejeitado: remover o bloco (`light-only` reduziria a auditoria pela metade, mas joga fora
  trabalho pronto) e toggle de tema com signal + localStorage → **adiado** (capacidade nova
  que nenhum requisito pede; ver `<deferred>`).

- **D-08:** O Design System é documentado no README como **tabela de tokens + inventário de
  componentes**: cada token de cor (nome da variável, valor `oklch`, hex equivalente, onde
  é usado), a escala tipográfica e de espaçamento que o app **realmente** usa, o `--radius`,
  e a lista dos componentes Spartan incorporados (`hlmBtn`, `hlmCard`, `hlmInput`,
  `hlmLabel`) com onde cada um aparece.
  Razão: verificável — quem avalia abre `styles.css` e confere linha a linha.
  Rejeitado: swatches visuais (GitHub não renderiza CSS inline em markdown; exigiria
  imagens commitadas que descolam na primeira mudança de paleta) e dividir o DS entre README
  e `.spec.md` (ID29 **nomeia o README** como o lugar do Design System).

### Acessibilidade e responsividade (UI-06 · ID2)

- **D-09:** A auditoria cobre **as 10 telas que existem**, todas com o **mesmo rigor**:
  `login`, `register`, `dashboard`, `create-group`, `join-group`, `group-view`,
  `manage-group`, `draw-result`, `authenticated-layout` (header + banner de D-02) e
  `christmas-countdown.card`.
  Razão: são só 10 e todas são `max-w-md` — o esforço marginal de auditar 10 em vez de 5 é
  pequeno, e "fluxos principais sem lacuna" é mais forte na banca do que uma amostra que
  alguém fura abrindo uma tela de fora da lista.
  Rejeitado: só o caminho crítico do participante (5 telas) e rigor variável por tela
  (produziria um documento com duas classes de rigor, convidando a pergunta "por que esta
  tela foi menos auditada?").

- **D-10:** A auditoria é **estática por Claude + checkpoint humano com Lighthouse**:
  1. Claude audita os 10 templates por leitura (labels, `aria`, ordem de headings,
     semântica, alvos de toque, navegação por teclado) e **calcula os contrastes
     matematicamente** a partir dos tokens `oklch`, **nos dois temas** (D-07), corrigindo o
     que encontrar.
  2. O usuário roda **Lighthouse + DevTools em 320px** e cola os resultados.
  3. A evidência vira documento **no mesmo formato de `docs/draw-privacy-verification.md`**.
  Razão: o critério 1 do ROADMAP diz "confirmado pelo Lighthouse" explicitamente, e o
  precedente da Fase 4 é duro — **o gap de alcançabilidade foi encontrado pelo smoke test
  humano, não pela suíte verde**.
  Rejeitado: só auditoria estática (mais rápida, mas não atende a letra do critério) e
  adicionar `axe-core` como gate de CI → **adiado** (dependência fora da §2; nenhum
  requisito pede teste automatizado de a11y; ver `<deferred>`).

- **D-11:** Entram nesta fase **as quatro correções** que o scout identificou como lacunas
  reais:
  - **a) `lang="pt-BR"` no `index.html`** — hoje é `lang="en"` num app 100% em português.
    Violação direta do **WCAG 3.1.1 (nível A, abaixo de AA)**, faz leitores de tela
    pronunciarem tudo com fonologia inglesa, e o Lighthouse acusa. Junto: trocar o
    `<title>AmigoSecreto</title>` por algo com o nome real do produto (**UTF-Secret**).
  - **b) Skip link** "Pular para o conteúdo" no início do `authenticated-layout`, visível
    apenas ao receber foco, apontando para o `<main>`. **WCAG 2.4.1 (nível A)** — hoje quem
    navega por teclado atravessa header, nome e botão Sair em **toda** troca de tela.
  - **c) `aria-live`** no banner de offline (D-02) e nos estados de carregamento
    ("Carregando...", "Sorteando..."). **Estende o padrão já existente** (`role="alert"` em
    6 telas, `role="status"` no countdown) — não inventa um padrão novo.
  - **d) Foco visível reforçado + alvos de toque de ~44px.** O foco hoje é só o
    `outline-ring/50` default, com `--ring` cinza. **Ponto crítico:** `oklch(0.708 0 0)`
    contra fundo branco é suspeito de reprovar o **contraste 3:1 do WCAG 1.4.11
    (Non-text Contrast)** — precisa ser recalculado de propósito **nos dois temas** com a
    paleta nova. Conferir também que os botões `size="sm"` atingem ~44px de alvo em 320px.

- **D-12:** **Ponto aberto para o researcher resolver (não é decisão de produto):** o ID2
  menciona "celulares, **tablets e desktops**", mas hoje **todas** as telas estão travadas
  em `max-w-md` — num desktop o app é uma coluna estreita centrada. Avaliar e **justificar
  por escrito** se `max-w-md` é defensável como escolha mobile-first deliberada (um app de
  amigo secreto é consumido no celular) ou se o layout merece um breakpoint acima. É leitura
  de rubrica, não preferência do usuário — decidir com argumento, não por omissão.

### Documentação de entrega (ENG-07, ENG-09, UI-07 · ID1, ID29, ID30)

- **D-13:** O **README passa a ser autossuficiente**, contendo de verdade: visão e core
  value, atores, user stories resumidas, regras de negócio, **o diagrama ER em Mermaid**
  (copiado de `docs/sdd.md` §3.2 — o GitHub renderiza), **o Design System** (D-08), a stack,
  como rodar, link do deploy e link do protótipo — com links para `prd.md`/`sdd.md` para o
  detalhe.
  Razão: ID29 diz "documentar esses artefatos no `README.md`, consolidando o PRD". Quem
  avalia abre o README e encontra tudo.
  **Custo aceito e a documentar:** o ER passa a existir em dois arquivos (README e SDD §3.2)
  e precisa ser mantido sincronizado.
  Rejeitado: README como índice que só linka (ID29 **nomeia** o README como o lugar do ER e
  do DS — um índice corre risco real de ser lido como requisito não cumprido) e esvaziar
  `docs/prd.md` (o CLAUDE.md declara prd.md/sdd.md como fonte da verdade, e vários
  CONTEXT.md de fases anteriores citam seções do prd.md **por número**).

- **D-14:** **O README leva a tabela completa da rubrica (RA1–RA8, IDs 1–32)** com, por
  linha: o ID, a exigência resumida, o status `[x]`, e **o ponteiro para onde o indicador
  está provado** — `arquivo:linha` ou o documento de evidência.
  Exemplos: ID8 → `dashboard.page.html:13` e `draw-result.page.html` (bloco `@defer`);
  ID22 → `core/interceptors/error.interceptor.ts`; ID32 → `core/draw-algorithm.spec.ts`;
  DRAW-10/privacidade → `docs/draw-privacy-verification.md`.
  Razão: **pedido explícito do usuário** nesta discussão, e transforma o README em roteiro
  de correção — o avaliador clica e confere em vez de caçar. A base já existe na tabela de
  rastreabilidade de `.planning/REQUIREMENTS.md` (linhas 113–149), então é **tradução, não
  trabalho do zero**.
  **Restrição de ordem (importante para o planner):** esta tabela só pode ser escrita **no
  fim da fase** — vários indicadores (ID1, ID2, ID3-PWA, ID4, ID29, ID30) só ficam marcáveis
  depois do trabalho desta própria fase. Escrita antes, nasce desatualizada.
  Rejeitado: checklist sem ponteiros (mera autodeclaração — não ajuda a confirmar nada, e é
  a confirmação que vale nota) e detalhar num `docs/rubric-coverage.md` à parte (obrigaria o
  avaliador a abrir um segundo arquivo justamente para a parte que comprova).

- **D-15:** O **`.spec.md` (ENG-09/ID30) descreve o sistema real**, com rigor: cada
  componente Standalone (inputs via `input()`, outputs, signals, responsabilidade) e cada
  Service (dependências via `inject()`, métodos, estado em signals).
  **E traz uma nota de processo honesta:** a especificação prévia que o ID30 pede ("antes da
  geração do código fonte") **de fato existiu** — nos artefatos do GSD
  (`.planning/phases/*/XX-CONTEXT.md` e `XX-PLAN.md`), **commitados antes de cada
  implementação, com histórico git que prova a ordem**. Atende ID30 pela substância e é
  verdadeiro: o projeto realmente especificou antes de codar, só não neste arquivo.
  Rejeitado: omitir a nota (perderia a chance de defender ID30 com evidência que o repositório
  realmente tem, e um avaliador atento ao `git log` levanta a questão sozinho) e **redigir em
  voz de especificação prévia fingindo que o código não existe** (apresentaria o processo de
  forma enganosa num trabalho acadêmico, e o `git log` contradiz em dois cliques).

- **D-16:** **O protótipo é produzido no Stitch, exportado/refinado no Figma, e publicado
  com link público do Figma** no README.
  Razão: atende o ID1 exatamente como escrito ("gerados via *Stitch* e refinados no *Figma*",
  link público no repositório) e mantém coerente o MCP do Figma que `docs/sdd.md` §1.2 já
  declara como obrigatório.
  Rejeitado: ficar só no Stitch (o SDD §1.2 declara o Figma, e um link que exija login não
  fecha o requisito de "link público") e um protótipo navegável publicado por Claude como
  Artifact (não é Figma nem Stitch — serviria como complemento, nunca como a entrega do
  UI-07).

- **D-17:** **INVERSÃO IMPORTANTE DE ORDEM — o protótipo é a FONTE do Design System**, não
  um registro do que já existe. A paleta de D-06 sai dele.
  **Como isso é conciliado sem bloquear a fase:** Claude aplica **já** a paleta natalina de
  D-06 como provisória, e o plano prevê uma **task explícita de reconciliação**: quando o
  protótipo estiver pronto, ajustar os tokens para casar, **reescrever a tabela do Design
  System no README** (D-08) e **revalidar o contraste** (D-10/D-11d).
  Razão: PWA, acessibilidade e documentação avançam em paralelo sem esperar o Figma, e o
  visual converge no fim. **Risco aceito e registrado:** se a paleta final divergir muito da
  provisória, a auditoria de contraste precisa ser refeita.
  Rejeitado: esperar o protótipo antes de tocar em `styles.css` (zero retrabalho, mas
  introduz bloqueio humano no meio da fase) e Claude definir a paleta para o usuário levar ao
  Stitch (uma só passada de contraste, mas o protótipo passaria a seguir o código — o oposto
  do design-to-code que o RA1 avalia).

- **D-18:** Claude produz **`docs/prototype-brief.md`** — roteiro de prompts, tela a tela,
  para o usuário usar como entrada no Stitch. Para cada uma das 10 telas de D-09: propósito,
  **os textos PT-BR reais já no código**, hierarquia de elementos, estados (vazio / erro /
  carregando) e o mapa de navegação entre frames.
  Razão: o protótipo sai cobrindo o sistema inteiro e com o vocabulário certo, em vez de
  telas genéricas de amigo secreto que depois não casam — o que reduziria o trabalho de
  reconciliação de D-17.

### Claude's Discretion

- Os valores `oklch` exatos da paleta natalina (verde-pinho, acentos) nos dois temas, desde
  que passem o contraste de D-10/D-11d e sejam documentados por D-08.
- O desenho do SVG base dos ícones e o mecanismo concreto do script de geração (D-04), desde
  que a questão da dependência nova seja resolvida e justificada.
- O texto exato do banner de offline, do skip link e das mensagens de `aria-live`, respeitado
  o PT-BR da UI.
- A estrutura de seções e o nome do arquivo de evidência da auditoria (D-10), seguindo o
  formato de `docs/draw-privacy-verification.md`.
- O nome e o local do `.spec.md` (raiz vs `docs/`), e sua organização interna.
- A divisão da fase em plans e a ordem entre elas, respeitada a restrição de ordem de D-14
  (tabela da rubrica por último) e a task de reconciliação de D-17.
- A estratégia de cache do `ngsw-config.json` e se o app expõe aviso de "nova versão
  disponível" via `SwUpdate` — não discutido, fica a critério do researcher/planner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### A rubrica — o contrato desta fase
- `docs/checklist.md` linhas 1–5 — **RA1 completo**: ID1 (protótipo navegável via Stitch
  refinado no Figma, link público no repositório), ID2 (Mobile-First em celulares, tablets
  **e desktops** — ver D-12), ID3 (PWA: manifest, ícones, cores de tema, **splash screen**,
  standalone, **comportamento visual em estados offline**).
- `docs/checklist.md` linha 12 — **ID4**: "Incorporar **e customizar**" framework CSS
  moderno. A palavra "customizar" é o que D-06 endereça.
- `docs/checklist.md` linhas 67–68 — **ID29** (ER em Mermaid + Design System **no README**,
  consolidando o PRD) e **ID30** (`.spec.md` rigoroso, componentes Standalone e Services,
  "antes da geração do código fonte" — ver D-15).
- `.planning/ROADMAP.md` §"Phase 5" — goal e os **5 success criteria**, que são o contrato
  de verificação da fase.
- `.planning/REQUIREMENTS.md` linhas 87–91 — **UI-03, UI-04, UI-05, UI-06, UI-07**.
- `.planning/REQUIREMENTS.md` linhas 101, 103 — **ENG-07** e **ENG-09**.
- `.planning/REQUIREMENTS.md` linhas 113–149 — **a tabela de rastreabilidade RA1–RA8 que
  D-14 traduz para o README**. Atenção à linha 127: ID12 (`effect()`) mapeado para UI-05,
  que é exatamente o `ConnectivityService` de D-03.

### Frontend: o que é tocado nesta fase
- `src/index.html` — **3 mudanças obrigatórias**: `lang="en"` → `lang="pt-BR"` (D-11a),
  `<title>` (D-11a), e o link do manifest + `<meta name="theme-color">` (D-01/D-05).
- `src/styles.css` — o `:root` com os tokens Spartan (paleta de D-06) e o bloco `:root.dark`
  que vira `@media (prefers-color-scheme: dark)` (D-07). Note o topo do arquivo: Tailwind v4
  **CSS-first**, sem `tailwind.config.js` — customização via `@theme`, não via config JS.
- `src/app/features/shell/authenticated-layout.page.html` — onde entram o **banner de
  offline** (D-02, acima do `<header>`) e o **skip link** (D-11b, apontando para o `<main>`
  que já existe na linha final).
- `src/app/core/services/` — onde nasce o `ConnectivityService` (D-03); seguir o padrão de
  `auth.service.ts` (signal privado + `computed()` derivados) e `supabase-client.service.ts`
  (injetável e mockável).
- `angular.json` — `assets` aponta para `public/` com glob `**/*`; os ícones de D-04 entram
  ali. O `ng add @angular/pwa` altera este arquivo (`serviceWorker` + `ngswConfigPath`).
- `src/app/app.config.ts` — onde o `provideServiceWorker()` é registrado. **Ler o arquivo
  antes de editar**: já carrega 4 providers com comentários explicando cada indicador; manter
  o padrão de comentar o indicador que cada provider entrega.
- As 10 telas de D-09 para a auditoria: `features/auth/login/`, `features/auth/register/`,
  `features/dashboard/` (page + `christmas-countdown.card`), `features/group/create/`,
  `features/group/join/`, `features/group/view/`, `features/group/manage/` (page +
  `participant-row`), `features/draw/result/`, `features/shell/`.

### O padrão a imitar na documentação
- `docs/draw-privacy-verification.md` — **o formato exato** que o documento de evidência da
  auditoria de D-10 deve seguir: assert declarado, método, saída real colada, conclusão.
- `docs/db-rls-verification.md` — o precedente mais antigo do mesmo formato, e exemplo de
  como uma **limitação conhecida é registrada em vez de omitida** (padrão para a nota de
  sincronização hex↔oklch de D-05 e para a duplicação do ER de D-13).
- `docs/sdd.md` §3.2 (linhas 143–189) — **o diagrama ER em Mermaid que D-13 copia** para o
  README.
- `docs/sdd.md` §5.1 (linhas 263–312) — a árvore de pastas real em disco, e §5.2/§5.3 (rotas
  e Core Services): **matéria-prima direta do `.spec.md`** de D-15.
- `docs/sdd.md` §4 (linhas 202–260) — os contratos TypeScript, também insumo do `.spec.md`.
- `docs/prd.md` — visão, atores, user stories e §5 (regras de negócio RN1–RN7): o conteúdo
  que D-13 consolida no README.

### Spec a atualizar no mesmo commit (regra do CLAUDE.md)
- `docs/sdd.md` §2 e §2.1 — **tabela da stack.** D-01 obriga a adicionar
  `@angular/service-worker`; se D-04 exigir uma lib de imagem, ela entra aqui **antes** de
  ser instalada. O SDD é explícito: nenhuma dependência externa sem refletir na tabela
  primeiro.
- `docs/sdd.md` §5.1 — a árvore ganha `core/services/connectivity.service.ts` (D-03) e
  `scripts/` (D-04); `public/` ganha os ícones e o manifest.
- `docs/sdd.md` §1.2 — Figma MCP: o arquivo do protótipo de D-16 é "o mesmo linkado no README
  por UI-07", como a seção já antecipa.

### Decisões herdadas (não reabrir)
- `.planning/phases/04-sorteio-e-revela-o/04-CONTEXT.md` — **D-06** (o `@defer` de
  `on interaction` na revelação; ID8 **já está coberto duas vezes**, não forçar um terceiro)
  e a rejeição explícita de **animação CSS 3D** na revelação, justamente para não complicar
  `prefers-reduced-motion` nesta auditoria.
- `.planning/phases/03-.../03-CONTEXT.md` — **D-05** (signals com refetch após mutação),
  **D-06** (`inject()` + service injetável), **D-03** (mapa de códigos estáveis → PT-BR),
  **D-10** (dashboard mobile-first em 320px já era requisito desde então).
- `.planning/phases/02-autentica-o-end-to-end/02-CONTEXT.md` — **D-04** (um signal escrito,
  resto `computed()` — o padrão que D-03 segue), **D-14** (`min-h-dvh`, `max-w-md`,
  mobile-first a partir de 320px — a decisão de layout que D-12 reavalia para desktop),
  **D-17** (mapa de erros PT-BR).

### Processo e gates mecânicos
- `.github/workflows/ci.yml` — os gates que o código novo precisa passar: `eslint
  --max-warnings=0`, `check:no-rxjs-state`, dois greps de secrets (`src/` **e** `dist/`),
  "nenhum NgModule", build de produção e `npm test`. **O service worker de D-01 adiciona
  arquivos a `dist/` — conferir que `check:no-secrets` continua passando.**
- `package.json` — scripts existentes e a lista de dependências que D-01/D-04 alteram.
- `.planning/phases/04-sorteio-e-revela-o/deferred-items.md` — **limpeza pendente de dados de
  teste em produção** (grupo "Teste2" + 2 usuários). Não é tarefa desta fase, mas precisa ser
  feito **antes da banca**; ver `<deferred>`.
- `CLAUDE.md` — Gitflow (**nunca** commitar em `main`, branchar de `develop`, integrar por
  PR), Conventional Commits, UI em PT-BR / código e entidades em inglês, Kanban atualizado
  **durante** o trabalho (ID28 grade o processo, não o estado final).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/app/features/shell/authenticated-layout.page.{ts,html}`** — ponto de entrada único
  para o banner de offline (D-02) e o skip link (D-11b). Já tem `<header>` e `<main>`
  separados, então ambos encaixam sem reestruturar nada.
- **`src/app/core/services/auth.service.ts`** — o padrão de signal privado + `computed()`
  derivados que `ConnectivityService` (D-03) copia.
- **`src/app/core/services/supabase-client.service.ts`** — o precedente de service injetável
  e mockável em Vitest, pensado desde a Fase 2 exatamente para specs.
- **`role="alert"` em 6 templates e `role="status"` no countdown** — o padrão de anúncio que
  D-11c estende; não inventar vocabulário novo de ARIA.
- **`src/app/features/group/manage/participant-row.html:17`** — o único `[attr.aria-label]`
  dinâmico do projeto; referência de como rotular ações contextuais.
- **`.planning/REQUIREMENTS.md` linhas 113–149** — a tabela de rastreabilidade que D-14
  traduz; evita reconstruir o mapeamento indicador→requisito do zero.

### Established Patterns
- **Tailwind v4 CSS-first**: `styles.css` importa `tailwindcss/*` em camadas e o preset do
  Spartan; **não existe `tailwind.config.js`**. Customização de tema é `@theme` + variáveis
  no `:root`, nunca config JS.
- **Mobile-first `max-w-md`** em todas as telas (herdado de D-14 da Fase 2) — favorável a
  320px por construção, mas é exatamente o que D-12 precisa reavaliar para desktop.
- **Signals como única fonte de estado**, com gate mecânico: `check:no-rxjs-state` **falha o
  CI** se aparecer `BehaviorSubject`/`new Subject` em `src/app`.
- **`inject()` em todo lugar**, nunca injeção por construtor (gate do ESLint).
- **Comentários citando o indicador** que cada trecho entrega (ver `app.config.ts` e
  `dashboard.page.html:11-12`) — manter esse hábito no código novo desta fase.

### Integration Points
- `src/index.html` — manifest, `theme-color`, `lang`, `title`.
- `src/app/app.config.ts` — `provideServiceWorker()` entra junto dos 4 providers existentes.
- `angular.json` — `assets` (ícones), e as chaves que o schematic do PWA adiciona.
- `public/` — hoje só `favicon.ico`; recebe `manifest.webmanifest` e os ícones.
- `docs/sdd.md` §2 — portão obrigatório de qualquer dependência nova (D-01, possivelmente
  D-04).

</code_context>

<specifics>
## Specific Ideas

- **Pedido explícito do usuário nesta discussão:** "No readme tem que ter aquele checklist
  com tudo o que foi implementado marcado também" → **D-14**, com a forma escolhida sendo
  indicador + status + **ponteiro para onde está no código**.
- **Correção de rumo do usuário sobre o protótipo:** "Acho que a prototipação será só no
  Stitch, depois adequamos só o visual do sistema para se assemelhar" → **D-17**, a inversão
  que torna o protótipo a fonte do Design System em vez de um registro do código existente.
  O usuário também levantou publicar o protótipo via Claude; descartado como entrega do UI-07
  por não ser Figma/Stitch (D-16), mas registrado como complemento possível.
- A identidade visual deve ser **temática sem exagero**: natalina em `--primary` e acentos,
  com o resto da UI neutro (D-06). Não transformar o app num cartão de Natal.
- A honestidade de processo no `.spec.md` (D-15) foi uma escolha deliberada do usuário entre
  três opções, incluindo uma que teria "casado melhor com a letra do ID30" fingindo
  precedência. O usuário escolheu a verdadeira.

</specifics>

<deferred>
## Deferred Ideas

- **Toggle de tema claro/escuro** com `ThemeService`, signal e persistência em
  `localStorage`, com botão no header. Demonstraria signal + `effect()` num segundo lugar,
  mas é capacidade de produto que **nenhum requisito (UI-01..07) pede**, e dobraria o
  trabalho de auditoria de contraste. D-07 entrega o tema escuro sem isso, via
  `prefers-color-scheme`. → Futura fase / v2.
- **Teste automatizado de acessibilidade** com `axe-core` como gate de CI, ao lado de
  `check:no-rxjs-state`. Tecnicamente o mais robusto, mas é **dependência fora da tabela §2
  do SDD** e nenhum requisito pede teste automatizado de a11y. → v2.
- **Bloquear botões de escrita enquanto offline** (criar grupo, salvar wishlist, sortear).
  Mais correto como produto que só o banner de D-02, mas espalharia a leitura do signal de
  conectividade por várias telas. → v2.
- **Prompt de "nova versão disponível"** via `SwUpdate` após um deploy. Não discutido; fica
  à discrição do researcher/planner se couber sem inflar a fase (ver Claude's Discretion).
- **Protótipo navegável publicado como Artifact** (ideia levantada pelo usuário). Não serve
  como entrega do UI-07 porque o ID1 avalia o uso de Stitch/Figma, mas poderia existir como
  complemento. → Não planejado.

### Dívidas de outras fases que precisam acontecer antes da banca (não são tarefas desta fase)
- **Limpeza de dados de teste em produção** — grupo "Teste2"
  (`9e0b6421-23e6-43d2-bbcd-3e162e08c4ef`) e os usuários `bruno-teste4@exemplo.com` /
  `carla-teste4@exemplo.com`, criados na verificação de DRAW-10. Rastreado como blocker em
  `.planning/STATE.md` e em `.planning/phases/04-sorteio-e-revela-o/deferred-items.md`.
- **`03-HUMAN-UAT.md` pendente** — a verificação humana de responsividade em 320px e o
  roteiro end-to-end com duas contas ficaram em aberto na Fase 3. **O checkpoint de D-10
  absorve naturalmente a parte de 320px** — o planner deve aproveitar a mesma passada em vez
  de pedir ao usuário duas sessões de browser separadas.
- **Fragilidade residual do `signUp`** (Supabase "Confirm email" precisa permanecer
  desativado) — registrada em `deferred-items.md` da Fase 2.

</deferred>

---

*Phase: 05-pwa-acessibilidade-e-entrega*
*Context gathered: 2026-10-15*
