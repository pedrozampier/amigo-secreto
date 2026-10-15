# Auditoria de Acessibilidade WCAG 2.1 AA (UI-06, D-09/D-10)

**Data:** 2026-10-15
**Projeto:** UTF-Secret
**Objetivo:** registrar a evidência da auditoria WCAG 2.1 AA das telas do aplicativo: contraste
calculado (não estimado) nos dois temas, auditoria estática de cada tela, a justificativa escrita
da decisão responsiva D-12 e o que ainda depende de verificação humana.
**Escopo:** as 10 telas de D-09, com o mesmo rigor em todas: `login`, `register`, `dashboard`,
`christmas-countdown` (card do dashboard), `create-group`, `join-group`, `group-view`,
`manage-group`, `draw-result` e `authenticated-layout` (shell com skip link e banner offline).

Formato inspirado em `docs/draw-privacy-verification.md` e `docs/db-rls-verification.md`: método,
saída real colada, critérios de PASS e limitações registradas em vez de omitidas.

## Parte A — Contraste calculado, não estimado

### Método

Os tokens foram lidos de `src/styles.css` por um script Node descartável (fora do repositório, sem
dependência nova) que extrai os valores `oklch()` do bloco `:root` (tema claro) e do bloco
`@media (prefers-color-scheme: dark)` (tema escuro) e aplica o pipeline:

1. oklch -> OKLab -> LMS (cubo) -> sRGB linear (matriz inversa de Björn Ottosson) -> clamp [0,1];
2. luminância relativa `L = 0.2126 R + 0.7152 G + 0.0722 B` (componentes lineares);
3. razão `(L1 + 0.05) / (L2 + 0.05)`, com L1 a maior luminância;
4. hex de exibição com gama sRGB.

Critérios: texto, WCAG 1.4.3, mínimo 4.5:1. Anel de foco e componentes de UI, WCAG 1.4.11, mínimo
3:1. `--border` e `--input` são decorativos (a identificação do campo vem do rótulo e do foco), logo
não se aplicam.

### Saída bruta do script

```
claro foreground [0.145 0 0] #0a0a0a on background #ffffff 19.79
claro muted-foreground [0.556 0 0] #737373 on background #ffffff 4.73
claro primary [0.35 0.07 155] #16452a on background #ffffff 10.95
claro primary-foreground [0.985 0 0] #fafafa on primary #16452a 10.49
claro accent-foreground [0.5 0.12 85] #825c00 on background #ffffff 6.04
claro destructive [0.577 0.245 27.325] #e7000b on background #ffffff 4.76
claro ring [0.52 0.09 155] #397852 on background #ffffff 5.27
claro background [1 0 0] #ffffff on foreground #0a0a0a 19.79
escuro foreground [0.985 0 0] #fafafa on background #0a0a0a 18.96
escuro muted-foreground [0.708 0 0] #a1a1a1 on background #0a0a0a 7.63
escuro muted-foreground [0.708 0 0] #a1a1a1 on card #171717 6.91
escuro primary [0.85 0.08 155] #a4deb7 on background #0a0a0a 12.91
escuro primary-foreground [0.205 0 0] #171717 on primary #a4deb7 11.68
escuro accent-foreground [0.8 0.13 85] #e4b750 on background #0a0a0a 10.52
escuro destructive [0.704 0.191 22.216] #ff6467 on background #0a0a0a 6.84
escuro ring [0.62 0.1 155] #50986b on background #0a0a0a 5.69
escuro background [0.145 0 0] #0a0a0a on foreground #fafafa 18.96
old ring (oklch 0.708 0 0 sobre branco) 2.59
```

### Tema claro (`:root`)

| Token | Valor oklch | Hex | vs. fundo | Razão | Critério | Veredito |
|:---|:---|:---|:---|:---|:---|:---|
| `--foreground` | `oklch(0.145 0 0)` | `#0a0a0a` | `--background` `#ffffff` | 19.79:1 | 1.4.3 (>= 4.5) | PASS |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#737373` | `--background` | 4.73:1 | 1.4.3 | PASS (margem pequena) |
| `--primary` (texto/ícone) | `oklch(0.35 0.07 155)` | `#16452a` | `--background` | 10.95:1 | 1.4.3 | PASS |
| `--accent-foreground` | `oklch(0.5 0.12 85)` | `#825c00` | `--background` | 6.04:1 | 1.4.3 | PASS |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#e7000b` | `--background` | 4.76:1 | 1.4.3 | PASS (margem pequena) |
| `--ring` (anel de foco) | `oklch(0.52 0.09 155)` | `#397852` | `--background` | 5.27:1 | 1.4.11 (>= 3) | PASS |
| `--border` | `oklch(0.922 0 0)` | n/a | n/a | n/a | decorativo | N/A |
| Composição: `--primary-foreground` sobre `--primary` (botão primário) | `oklch(0.985 0 0)` / `oklch(0.35 0.07 155)` | `#fafafa` / `#16452a` | n/a | 10.49:1 | 1.4.3 | PASS |
| Composição: banner offline, `text-background` sobre `bg-foreground` | `oklch(1 0 0)` / `oklch(0.145 0 0)` | `#ffffff` / `#0a0a0a` | n/a | 19.79:1 | 1.4.3 | PASS |

### Tema escuro (`@media (prefers-color-scheme: dark)`)

| Token | Valor oklch | Hex | vs. fundo | Razão | Critério | Veredito |
|:---|:---|:---|:---|:---|:---|:---|
| `--foreground` | `oklch(0.985 0 0)` | `#fafafa` | `--background` `#0a0a0a` | 18.96:1 | 1.4.3 | PASS |
| `--muted-foreground` | `oklch(0.708 0 0)` | `#a1a1a1` | `--background` | 7.63:1 | 1.4.3 | PASS |
| `--muted-foreground` sobre `--card` `#171717` | idem | idem | `--card` | 6.91:1 | 1.4.3 | PASS |
| `--primary` (texto/ícone) | `oklch(0.85 0.08 155)` | `#a4deb7` | `--background` | 12.91:1 | 1.4.3 | PASS |
| `--accent-foreground` | `oklch(0.8 0.13 85)` | `#e4b750` | `--background` | 10.52:1 | 1.4.3 | PASS |
| `--destructive` | `oklch(0.704 0.191 22.216)` | `#ff6467` | `--background` | 6.84:1 | 1.4.3 | PASS |
| `--ring` (anel de foco) | `oklch(0.62 0.1 155)` | `#50986b` | `--background` | 5.69:1 | 1.4.11 | PASS |
| `--border` | `oklch(1 0 0 / 10%)` | n/a | n/a | n/a | decorativo | N/A |
| Composição: `--primary-foreground` sobre `--primary` (botão primário) | `oklch(0.205 0 0)` / `oklch(0.85 0.08 155)` | `#171717` / `#a4deb7` | n/a | 11.68:1 | 1.4.3 | PASS |
| Composição: banner offline, `text-background` sobre `bg-foreground` | `oklch(0.145 0 0)` / `oklch(0.985 0 0)` | `#0a0a0a` / `#fafafa` | n/a | 18.96:1 | 1.4.3 | PASS |

O banner (`src/app/features/shell/authenticated-layout.page.html`) usa de fato as classes
`bg-foreground ... text-background`, conferido no arquivo.

### Divergências em relação aos valores esperados no planejamento

Os valores calculados prevaleceram sobre os esperados:

- `--primary` claro sobre branco: esperado 12.31:1, **calculado 10.95:1** (o 12.31 não corresponde a
  nenhum par medido aqui; o par botão, `--primary-foreground` sobre `--primary`, dá 10.49:1). Ambos
  passam com folga.
- `--destructive` escuro: esperado 6.89:1, **calculado 6.84:1**. Diferença de arredondamento/clamp;
  passa.
- Os demais (19.79, 4.73, 6.04, 4.76, 5.27, 18.96, 7.63, 12.91, 10.52, 5.69, 2.59) coincidem.

Nenhum par reprovou.

### Defeitos encontrados e corrigidos

1. **`--ring` claro `oklch(0.708 0 0)` = 2.59:1**, abaixo de 3:1 e portanto reprovando 1.4.11.
   Corrigido para `oklch(0.52 0.09 155)` = 5.27:1. Além disso, o `outline-ring/50` global foi trocado
   por `*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }` (100% de opacidade,
   2px), já que a opacidade de 50% diluiria o anel abaixo do contraste calculado.
2. **Banner offline planejado como `bg-destructive text-white`** daria cerca de 3:1 no tema escuro
   (`--destructive` escuro é claro, `oklch(0.704 0.191 22.216)`), reprovando 1.4.3. Trocado por
   `bg-foreground`/`text-background` antes de ir para produção (19.79:1 e 18.96:1). Defeito evitado
   em planejamento, nunca chegou ao código entregue.

## Parte B — Auditoria estática das 10 telas

Método: leitura dos templates `.html` e dos specs, mais as correções registradas nos relatórios das
plans 05-02 e 05-03. Não é uma varredura automatizada (ver limitações).

| Tela (arquivo) | Headings | Labels/forms | ARIA | Teclado | Alvos de toque | Correção aplicada |
|:---|:---|:---|:---|:---|:---|:---|
| `login` (`features/auth/login/login.page.html`) | `h1` "Entrar" | `label for` casado com `id` | n/a | nativo | link "Criar conta" é `variant="link"` inline, sem `min-h-11` | nenhuma necessária |
| `register` (`features/auth/register/register.page.html`) | `h1` "Criar conta" | nome, e-mail e senha com `label for`/`id` | n/a | nativo | link "Entrar" inline, sem `min-h-11` | nenhuma necessária |
| `dashboard` (`features/dashboard/dashboard.page.html`) | `h1` "Olá, ..." | n/a | "Carregando seus grupos..." com `role="status" aria-live="polite"` | nativo | botões `size="sm"` com `min-h-11` | região viva + `min-h-11` |
| `christmas-countdown` (`features/dashboard/christmas-countdown.card.html`) | herda `h1` do dashboard | n/a | "Carregando feriados..." com `role="status"` | n/a | n/a | região viva |
| `create-group` (`features/group/create/create-group.page.html`) | dois `h1`, em ramos exclusivos | `label for` casado | n/a | nativo | botões `min-h-11` | nenhuma (ver abaixo) |
| `join-group` (`features/group/join/join-group.page.html`) | `h1` "Convite" | n/a | "Carregando convite..." com `role="status"` | nativo | "voltar ao dashboard" é link inline, sem `min-h-11` | região viva + `min-h-11` nos botões |
| `group-view` (`features/group/view/group-view.page.html`) | `h1` com nome do grupo | wishlist com `label for` | "Carregando participantes..." com `role="status"` | nativo | botões `min-h-11` | região viva + `min-h-11` |
| `manage-group` (`features/group/manage/manage-group.page.html`, `participant-row.html`) | `h1` com nome do grupo | wishlist e link de convite com `label for` | "Carregando participantes..." e região "Sorteando..." | nativo | botões e `participant-row` com `min-h-11` | região viva + `min-h-11` |
| `draw-result` (`features/draw/result/draw-result.page.html`) | começava em `h2` sem `h1` | n/a | n/a | nativo | n/a | `<h1 class="sr-only">Meu amigo secreto</h1>` antes do `@switch`; `@defer` e `h2` intactos |
| `authenticated-layout` (`features/shell/authenticated-layout.page.html`) | n/a (cada tela tem o seu) | n/a | banner offline `role="status"`; `main` com `id`, `tabindex="-1"` | skip link | botão "Sair" com `min-h-11` | skip link, banner, container `lg:` |

### Decisões e veredictos por item

- **Dois `<h1>` em `create-group`:** falso positivo. Estão em ramos exclusivos de
  `@if (grupoCriado())` / `@else`, então só um existe no DOM por vez. Nada foi alterado.
- **`draw-result`:** a tela começava em `h2` sem `h1` (salto de nível). Corrigido com um `h1`
  `sr-only`, sem mexer no `@defer` nem no `h2` revelado.
- **Skip link (WCAG 2.4.1):** o link usa `(click)` + `preventDefault()` + `focus()` em vez de
  `href="#main-content"` puro, porque o `<base href="/">` do `index.html` faria o href navegar para
  `/#main-content`, saindo da rota atual. O handler foca o `<main id="main-content" tabindex="-1">`
  (via `viewChild.required`) sem mudar a URL. Há spec
  (`authenticated-layout.page.spec.ts`, 4 testes) provando foco no `<main>` sem mudança de URL.
- **"Sorteando..." (D-11c):** a região viva é um `<p class="sr-only" role="status" aria-live="polite">`
  persistente, irmão do `@if (confirmandoSorteio())` (fora do ramo condicional), com o conteúdo
  condicionado a `sorteando()`. Motivo: a troca de texto dentro de um botão desabilitado não é
  anunciada de forma confiável por leitores de tela.
- **Idioma e título (WCAG 3.1.1, 2.4.2):** `src/index.html` tem `<html lang="pt-BR">` e
  `<title>UTF-Secret - Amigo Secreto Online</title>`.
- **Alvos de toque sem `min-h-11`:** apenas os links `variant="link"` em texto corrido (login "Criar
  conta", register "Entrar", join "voltar ao dashboard"). São links inline dentro de frases, onde um
  alvo de 44px quebraria a linha de texto; todos os botões e links `size="sm"` receberam `min-h-11`.
  Observação: o WCAG 2.1 AA exige 44px apenas no 2.5.5, que é nível AAA, então isto é prática
  adicional, não requisito AA.
- **Rótulos:** login, register, group-view e manage-group já tinham `label for` casado com `id`.
  Nada a corrigir.
- **Idioma de trechos (WCAG 3.1.2, AA) — defeito conhecido, não corrigido:** o card
  `christmas-countdown` usa `DatePipe` e não há locale pt-BR registrado (nenhum `LOCALE_ID` nem
  `registerLocaleData` em `src/`), então o mês aparece em inglês ("25 de December de 2026") dentro
  de uma página `lang="pt-BR"`. Registrado em `deferred-items.md`; a correção prevista é
  `registerLocaleData(localePt)` + `LOCALE_ID` `pt-BR` em `app.config.ts`. Enquanto isso, este item
  **não** pode ser declarado conforme.

## Parte C — Responsividade e a decisão de D-12

O ID2 da rubrica cita "celulares, tablets e desktops". Decisão registrada:

- O shell autenticado (`authenticated-layout`) alarga em `lg:` (`lg:max-w-3xl`, com `lg:px-8
  lg:py-6` no `<main>`), mantendo o `max-w-md` de **componente** intacto. O cabeçalho usa a mesma
  largura (`max-w-md lg:max-w-3xl`).
- **Por quê:** `max-w-md` é uma boa largura de leitura em celular, que é o contexto real de uso
  (abrir o convite recebido por mensagem). Sem o alargamento, o desktop viraria uma coluna estreita
  no meio de uma tela vazia. Alargar só o container resolve isso sem redesenhar componentes, coerente
  com a regra de que a Fase 5 não cria telas novas.
- **`/login` e `/register` continuam estreitos:** ficam fora do shell autenticado; um formulário
  único centrado é um padrão defensável também em desktop.
- **Piso de 320px:** a confirmar no checkpoint humano da plan 05-05 (DevTools a 320px). Este
  documento não afirma que passou.

## Parte D — Pendente de verificação humana

Só o checkpoint da 05-05 fecha estes itens. Espaços reservados para colar a saída real:

| Verificação | Como | Resultado |
|:---|:---|:---|
| Lighthouse (Acessibilidade, PWA) na URL publicada (preview da Vercel ou produção) | DevTools -> Lighthouse | _a preencher_ |
| Layout a 320px, sem rolagem horizontal | DevTools, largura 320 | _a preencher_ |
| Teclado de ponta a ponta, incluindo skip link | Tab/Shift+Tab/Enter em todas as telas | _a preencher_ |
| Banner offline | DevTools -> Network -> Offline | _a preencher_ |
| Os dois temas | emulação de `prefers-color-scheme` (claro e escuro) | _a preencher_ |

## Critérios de PASS

- Todo par de texto >= 4.5:1 e todo anel/componente >= 3:1, nos dois temas: **atendido** (Parte A).
- Skip link funcional com spec: **atendido**.
- Regiões vivas para "Carregando..." e "Sorteando...": **atendido** (ver limitações d e e).
- Um `h1` por tela, sem salto de nível: **atendido** nas telas auditadas.
- Verificação em navegador real (Lighthouse, 320px, teclado): **pendente** (Parte D).
- Idioma de trechos (3.1.2) no card de contagem: **não atendido**, deferido.

## Resumo por requisito

| Requisito | Evidência | Status |
|:---|:---|:---|
| UI-06 (acessibilidade WCAG 2.1 AA) | Partes A e B | Parcial: estático e matemático OK; verificação humana (Parte D) e item 3.1.2 pendentes |
| D-12 / RA1-ID2 (responsividade) | Parte C | Decisão justificada; 320px a confirmar |

## Limitações registradas honestamente

a. O contraste é matemático e cobre os tokens e as composições listadas, não cada composição interna
   dos componentes Spartan (estados hover, disabled, variantes).
b. Não há gate automatizado de acessibilidade no CI. `axe-core` foi deferido para a v2 por estar
   fora da tabela §2 do SDD (regra de não adicionar dependências).
c. O hex do manifest (`theme_color` `#16452a`) é sincronizado **à mão** com os tokens oklch (D-05: o
   manifest não aceita `oklch()` nem `var()`). O `background_color` do manifest é `#fafafa`, enquanto
   o fundo claro do app é `#ffffff`; é apenas a cor da splash, mas não são idênticos.
d. Os 5 `<p>` "Carregando..." são regiões `role="status"` montadas junto com o texto pelo `@if`.
   Os leitores principais anunciam, mas é menos robusto que uma região persistente.
e. Os textos "Entrando...", "Criando...", "Criando conta...", "Salvando...", "Saindo..." dentro de
   botões não ganharam região viva: D-11c nomeia "Carregando..." e "Sorteando...". Decisão de escopo.
f. Sem locale pt-BR no `DatePipe` (ver Parte B, WCAG 3.1.2).
g. Esta auditoria é estática (leitura de código e specs); não substitui teste com leitor de tela real.
