# Phase 5: PWA, Acessibilidade e Entrega - Discussion Log

> **Trilha de auditoria apenas.** Não usar como insumo de agentes de planejamento, pesquisa
> ou execução. As decisões estão em `05-CONTEXT.md` — este log preserva as alternativas
> consideradas e por que foram rejeitadas.

**Date:** 2026-10-15
**Phase:** 05-pwa-acessibilidade-e-entrega
**Areas discussed:** PWA e offline, Design System e identidade visual, Escopo da auditoria de acessibilidade, Documentação de entrega

---

## Seleção de áreas

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Estratégia de PWA e offline | Service worker vs manifest manual; forma do estado offline | ✓ |
| Design System e identidade visual | ID4 "customizado"; paleta; dark mode morto | ✓ |
| Escopo da auditoria de acessibilidade | Quais telas, método, correções | ✓ |
| Documentação de entrega (README, .spec.md, Figma) | ENG-07/ENG-09/UI-07 | ✓ |

**Escolha do usuário:** todas as quatro.

---

## Área 1 — PWA e offline

### Q1: Instalar `@angular/service-worker` ou manifest manual?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| `ng add @angular/pwa` completo | Instala o pacote oficial na linha 21; gera manifest, ícones, ngsw-config. Único caminho em que o Lighthouse marca "Installable" sem ressalva (critério 1 do ROADMAP). Exige atualizar SDD §2 | ✓ |
| Manifest manual, sem service worker | Zero dependência nova, mas o app não abre offline de forma alguma e o Lighthouse não dá PWA instalável pleno | |
| `ng add` com SW desativado em dev | Igual à primeira, mas explicitando `enabled: !isDevMode()` (que já é o default do schematic) | |

**User's choice:** `ng add @angular/pwa` completo → **D-01**
**Notes:** O usuário aceitou a consequência de adicionar uma dependência, que no projeto
exige atualizar a tabela §2 de `docs/sdd.md` no mesmo commit.

### Q2: Como o estado offline aparece na interface?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Banner global no topo do layout | Faixa no `authenticated-layout`, acima do header; não desmonta a tela atual | ✓ |
| Tela cheia de offline | Mais dramático de demonstrar, mas destrói o contexto e obriga a renavegar | |
| Banner + bloqueio de botões de escrita | Mais correto como produto, mas espalha o signal por várias telas | |

**User's choice:** Banner global → **D-02**
**Notes:** A opção de bloquear botões de escrita foi registrada como ideia adiada (v2), não
descartada.

### Q3: Como o status de conexão é modelado em código?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Service com signal + `effect()` | `ConnectivityService` com signal privado e listeners do window; o `effect()` do ID12 entra aqui de forma honesta | ✓ |
| `toSignal()` sobre `fromEvent` | Demonstraria ID24 de novo, mas ID24 já está entregue pelo HolidayService e introduziria RxJS sem necessidade | |
| Signal no próprio componente de layout | Menos arquivos, mas não mockável em spec nem reutilizável | |

**User's choice:** Service com signal + `effect()` → **D-03**

### Q4: De onde vêm os ícones do PWA?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Gerar por script a partir de um SVG próprio | Determinístico, versionado, casa com a paleta nova. Precisa checar se dá sem dependência nova | ✓ |
| Placeholders do `ng add` | Funciona imediato, mas entregar com o logo do Angular é fraco numa banca que avalia usabilidade | |
| Usuário fornece os PNGs | Melhor visual, mas vira bloqueio humano no meio da fase | |

**User's choice:** Gerar por script → **D-04**
**Notes:** Ficou como ponto aberto para o researcher: se a conversão SVG→PNG exigir lib nova
(ex. `sharp`), isso obriga atualizar o SDD §2 antes — avaliar e justificar.

### Q5: Continuar na área ou avançar?

**User's choice:** Próxima área.

---

## Área 2 — Design System e identidade visual

### Q1: Qual identidade visual?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Natalina sóbria (verde-pinho + vermelho) | `--primary` verde-pinho, acento dourado/vermelho em destaques, resto neutro. Mudança pequena, efeito visível | ✓ |
| Paleta de marca única não-natalina | Atemporal, mas perde a amarração com o contador de Natal da BrasilAPI já no dashboard | |
| Manter cinza, customizar tipografia/raio | Leitura mais fraca de ID4 — num print ninguém vê diferença do Spartan default | |

**User's choice:** Natalina sóbria → **D-06**
**Notes:** Contexto factual apresentado: todos os tokens atuais têm croma literalmente zero.

### Q2: O que fazer com o bloco `:root.dark` que nunca é ativado?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Manter, ativar via `prefers-color-scheme` | Deixa de ser código morto por uma linha de CSS; respeita preferência declarada do usuário | ✓ |
| Remover o bloco | Reduz a auditoria de contraste pela metade, mas joga fora trabalho pronto | |
| Toggle de tema com signal + localStorage | Capacidade nova que nenhum requisito pede; dobraria a auditoria | |

**User's choice:** Ativar via `prefers-color-scheme` → **D-07**
**Notes:** Consequência aceita explicitamente: a auditoria de contraste passa a cobrir os
dois temas. O toggle foi registrado como ideia adiada (v2).

### Q3: Qual `theme_color` / `background_color` no manifest?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Verde-pinho fixo nos dois, em hex | Simples e resolve um problema real: o manifest não aceita `oklch()` nem `var()`, então hex é obrigatório — e precisa ficar sincronizado à mão | ✓ |
| Dois `<meta theme-color>` com media query | Mais fiel ao tema, mas duplica valores em três lugares para ganho que a banca não nota | |
| Background claro + theme escuro | Combinação padrão de muitos apps; o `background_color` é o que pinta a splash screen | |

**User's choice:** Verde-pinho fixo em hex → **D-05**
**Notes:** A limitação hex↔oklch deve ser documentada no README, não escondida.

### Q4: Como o Design System é documentado no README (ID29)?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Tabela de tokens + inventário de componentes | Variável, oklch, hex, uso + escala tipográfica + `--radius` + componentes Spartan e onde aparecem. Verificável contra `styles.css` | ✓ |
| Tabela + amostras visuais | Mais bonito, mas o GitHub não renderiza CSS inline; exigiria imagens que descolam na primeira mudança | |
| Resumo no README + detalhe no `.spec.md` | Evita README gigante, mas ID29 nomeia o README como o lugar do Design System | |

**User's choice:** Tabela de tokens + inventário → **D-08**

### Q5: Continuar na área ou avançar?

**User's choice:** Próxima área.

---

## Área 3 — Escopo da auditoria de acessibilidade

### Q1: Quais telas entram na auditoria?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| As 10 telas que existem | Esforço marginal pequeno (todas são `max-w-md`), e "sem lacuna" é mais forte que uma amostra que alguém fura | ✓ |
| Só o caminho crítico (5 telas) | Atende a letra de "fluxos principais", mas deixa as telas de admin sem auditoria | |
| 10 telas com rigor variável | Prioriza onde importa, mas produz documento com duas classes de rigor | |

**User's choice:** As 10 telas, mesmo rigor → **D-09**

### Q2: Como a auditoria é conduzida e comprovada?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Estática (Claude) + checkpoint humano com Lighthouse | Claude audita os 10 templates e calcula contrastes dos tokens oklch; usuário roda Lighthouse/DevTools em 320px e cola o resultado | ✓ |
| Só auditoria estática de código | Sem bloqueio humano, mas o critério 1 do ROADMAP pede Lighthouse explicitamente | |
| Adicionar `axe-core` como gate de CI | Mais robusto, mas dependência fora da §2 e nenhum requisito pede teste automatizado de a11y | |

**User's choice:** Estática + checkpoint humano → **D-10**
**Notes:** Argumento aceito: na Fase 4, o gap de alcançabilidade foi encontrado pelo smoke
test humano, não pela suíte verde. `axe-core` virou ideia adiada.

### Q3: Quais correções entram nesta fase? (multiseleção)

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| `lang="pt-BR"` + `<title>` | Hoje `lang="en"` num app 100% PT-BR — viola WCAG 3.1.1 (nível A) e o Lighthouse acusa | ✓ |
| Skip link para o `<main>` | WCAG 2.4.1 (nível A); hoje o teclado atravessa o header em toda troca de tela | ✓ |
| `aria-live` no banner de offline e nos carregamentos | Estende o padrão `role="alert"`/`role="status"` já existente | ✓ |
| Foco visível reforçado + alvos de 44px | `--ring` cinza suspeito de reprovar o 3:1 do WCAG 1.4.11; revisar nos dois temas | ✓ |

**User's choice:** Todas as quatro → **D-11**

### Q4: Continuar na área ou avançar?

**User's choice:** Última área.
**Notes:** Antes de avançar, Claude registrou unilateralmente um ponto que não exigia
decisão do usuário: o ID2 menciona tablets e desktops, mas tudo está travado em `max-w-md`.
Virou **D-12** como tarefa de avaliação e justificativa para o researcher, não como pergunta.

---

## Área 4 — Documentação de entrega

### Q1: Como o README consolida o PRD (ENG-07/ID29)?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| README autossuficiente, ER e DS inline | Contém de verdade visão, atores, stories, regras, ER em Mermaid, Design System, stack, links. Custo: ER duplicado, a sincronizar | ✓ |
| README como índice que linka os docs | Zero duplicação, mas ID29 nomeia o README como o lugar do ER e do DS | |
| README autossuficiente e `prd.md` vira stub | Fonte única, mas quebraria referências por número de seção em vários CONTEXT.md anteriores | |

**User's choice:** README autossuficiente → **D-13**

### Q2 (interrupção do usuário): checklist da rubrica no README

**Mensagem do usuário, no meio do turno:** "No readme tem que ter aquele check list com tudo
o que foi implementado marcado também"

Tratado como adição ao escopo de ENG-07 (o README é o entregável do requisito), não como
capacidade nova. Gerou uma pergunta de forma:

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Indicador + status + onde está no código | Uma linha por ID com `arquivo:linha` ou doc de evidência; traduz a rastreabilidade de REQUIREMENTS.md | ✓ |
| Indicador + status, sem ponteiros | Mais curto, mas é só autodeclaração — não ajuda a confirmar nada | |
| Checklist no README + evidência em arquivo separado | README legível, mas obriga abrir um segundo arquivo justamente para a parte que comprova | |

**User's choice:** Com ponteiros para o código → **D-14**
**Notes:** Claude registrou a restrição de ordem: a tabela só pode ser escrita no fim da
fase, porque ID1/ID2/ID3-PWA/ID4/ID29/ID30 só ficam marcáveis depois do trabalho desta fase.

### Q3: O `.spec.md` descreve o código real ou simula precedência?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Spec do sistema real, honesta sobre o processo | Documento rigoroso + nota apontando os artefatos GSD commitados antes de cada implementação, com git log como prova da ordem | ✓ |
| Spec do sistema real, sem nota de processo | Mais limpo, mas perde a defesa de ID30 com evidência que o repositório tem | |
| Redigir como se precedesse o código | Casaria com a letra do ID30, mas apresenta o processo de forma enganosa e o git log contradiz | |

**User's choice:** Honesta sobre o processo → **D-15**
**Notes:** Claude marcou a terceira opção como não recomendada por ser enganosa num trabalho
acadêmico. O usuário escolheu a opção verdadeira.

### Q4 (primeira tentativa — rejeitada pelo usuário)

Claude perguntou como o protótipo Figma seria produzido, oferecendo: (a) usuário monta no
Figma com brief do Claude, (b) Stitch → Figma, (c) screenshots do app montados como
protótipo. **O usuário interrompeu antes de responder** e corrigiu a premissa:

> "Acho que a prototipação será só no sticth, depois adequamos só o visual do sistema para
> se assemelhar, ou usamos a propria prototipação da anthropic pelo claude sabe?"

Isso inverteu uma suposição que Claude tinha embutido na pergunta: que o protótipo
registraria o visual já existente. Na verdade o protótipo passa a ser a **fonte** do Design
System. As perguntas seguintes foram refeitas sobre essa premissa corrigida.

### Q5: Onde o protótipo fica hospedado para o link público?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Stitch → exporta para Figma → link público do Figma | Atende o ID1 como escrito ("gerados via Stitch e refinados no Figma") e mantém coerente o MCP do Figma do SDD §1.2 | ✓ |
| Só Stitch, com link de compartilhamento | Menos uma etapa, mas o SDD §1.2 declara o Figma e um link com login não fecha "link público" | |
| Claude publica um Artifact navegável | Claude produziria sozinho, mas não é Figma nem Stitch — o RA1 avalia o uso dessas ferramentas | |

**User's choice:** Stitch → Figma → link público → **D-16**

### Q6: O protótipo é pré-requisito do Design System ou andam em paralelo?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Paleta provisória agora, reconciliada depois | Aplica D-06 já e prevê task explícita de reconciliação (tokens + tabela do README + revalidar contraste) quando o protótipo sair | ✓ |
| Esperar o protótipo antes de tocar no styles.css | Zero retrabalho e uma só passada de contraste, mas bloqueia a fase no meio | |
| Claude define a paleta, usuário leva ao Stitch | Nenhum retrabalho, mas o protótipo passaria a seguir o código — oposto do design-to-code que o RA1 avalia | |

**User's choice:** Paleta provisória + reconciliação → **D-17**
**Notes:** Risco aceito e registrado: se a paleta final divergir muito, a auditoria de
contraste precisa ser refeita.

### Q7: Claude produz um brief das telas para os prompts do Stitch?

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Sim — roteiro de prompts por tela | `docs/prototype-brief.md` com as 10 telas: propósito, textos PT-BR reais, hierarquia, estados, mapa de navegação | ✓ |
| Não — usuário escreve os prompts | Mais liberdade criativa, mas risco de o protótipo cobrir telas que o app não tem | |
| Sim, mas só um resumo curto | Enxuto, sem estados nem textos | |

**User's choice:** Roteiro de prompts por tela → **D-18**

---

## Claude's Discretion

Áreas em que o usuário não foi consultado por serem decisões de implementação:

- Valores `oklch` exatos da paleta nos dois temas (desde que passem o contraste).
- Desenho do SVG base e mecânica do script de geração de ícones.
- Textos exatos do banner de offline, skip link e mensagens de `aria-live`.
- Estrutura e nome do documento de evidência da auditoria.
- Nome e local do `.spec.md` (raiz vs `docs/`).
- Divisão da fase em plans e ordem entre elas.
- Estratégia de cache do `ngsw-config.json` e prompt de `SwUpdate` — **não discutido em
  nenhuma pergunta**; explicitamente deixado ao researcher/planner.

## Deferred Ideas

- Toggle de tema claro/escuro com `ThemeService` + localStorage → v2.
- `axe-core` como gate automatizado de a11y no CI → v2.
- Desabilitar botões de escrita enquanto offline → v2.
- Prompt de "nova versão disponível" via `SwUpdate` → a critério do planner.
- Protótipo navegável publicado como Artifact (levantado pelo usuário) → não planejado;
  não serve como entrega do UI-07.

## Dívidas de fases anteriores levantadas durante a discussão

- Limpeza de dados de teste em produção (grupo "Teste2" + 2 usuários da verificação de
  DRAW-10) — blocker em STATE.md, precisa acontecer antes da banca.
- `03-HUMAN-UAT.md` pendente (320px + roteiro com duas contas) — a parte de 320px é
  absorvida pelo checkpoint de D-10; o planner deve aproveitar a mesma sessão de browser.
- Fragilidade do `signUp` com "Confirm email" (Fase 2) — permanece registrada.
