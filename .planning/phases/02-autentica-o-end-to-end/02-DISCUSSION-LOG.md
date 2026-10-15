# Phase 2: Autenticação End-to-End - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-14
**Phase:** 02-autentica-o-end-to-end
**Areas discussed:** Boot da sessão e o F5, Telas e layout de login/cadastro, Validação dos Reactive Forms e mensagens de erro, Shell autenticado/logout/redirect

---

## Seleção de áreas

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Boot da sessão e o F5 | `provideAppInitializer` vs. guard tratando `'loading'` | ✓ |
| Telas e layout de login/cadastro | Rotas separadas vs. toggle; campos; visual Spartan | ✓ |
| Validação dos Reactive Forms e mensagens de erro | Regra de senha, timing do erro, tradução PT-BR | ✓ |
| Shell autenticado, logout e redirect pós-login | Onde vive o logout, redirects, `returnUrl`, escopo da dashboard | ✓ |

**Nota:** todas as 4 áreas foram selecionadas.

---

## Boot da sessão e o F5

### Estratégia contra o flash de /login

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| `provideAppInitializer` | App não inicializa até `getSession()` resolver; guard fica trivial; custo ~100ms de localStorage | ✓ |
| Guard assíncrono que espera `'loading'` | `toObservable` + `filter` + `firstValueFrom`; demonstra ID24 naturalmente, mas todo guard futuro repete a espera | |
| Os dois combinados | Mais robusto, mas o guard parece ter lógica morta | |

**User's choice:** `provideAppInitializer`
**Notes:** Critério decisivo foi a defensabilidade em banca — o guard vira um `if` de 3 linhas.

### Forma do estado no AuthService

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Signal de sessão + `computed` derivados | Um signal privado, resto derivado; é o que ID9 pede; padrão de ARCHITECTURE.md:470 | ✓ |
| Signal de status + signal de sessão separados | Mais explícito, mas dois lugares para atualizar e risco de dessincronia | |

**User's choice:** Signal de sessão + `computed` derivados

### Onde o cliente Supabase é criado

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| `SupabaseClientService` injetável | `providedIn:'root'` expondo `.client`; mockável no Vitest; coerente com ID14 (variante de STACK.md) | ✓ |
| Constante exportada de um módulo | `export const supabase = createClient(...)`; mais curto, mas singleton global difícil de mockar | |

**User's choice:** `SupabaseClientService` injetável

### Superfície do AuthService nesta fase

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Só o essencial da fase | `signUp()`, `signIn()`, `signOut()` + signals de estado | ✓ |
| Essencial + perfil do usuário | Também um signal com a linha de `profile`; adiciona query no boot | |
| Você decide | Deixar para o planner | |

**User's choice:** Só o essencial da fase

### Onde o ID24 vive

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Fase 3 (BrasilAPI), como planejado | ROADMAP já mapeia ID24 para API-04; uso genuinamente natural | ✓ |
| Também na Fase 2, no AuthService | `toObservable(session)` redundante só para garantir o indicador | |

**User's choice:** Fase 3, como planejado
**Notes:** Evita código que ninguém consome — com `provideAppInitializer` o AuthService não precisa da ponte RxJS.

### Como o authGuard redireciona

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Retorna `UrlTree` | `createUrlTree(['/login'])`; forma canônica, redireciona atomicamente | ✓ |
| `router.navigate()` + `return false` | Funciona, mas gera navegação dupla no histórico; padrão antigo | |

**User's choice:** Retorna `UrlTree`

---

## Telas e layout de login/cadastro

### Rotas separadas ou tela com alternância

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| `/login` e `/register` separadas | Conforme SDD §5.2, que já define as duas rotas e os dois arquivos | ✓ |
| Uma tela `/auth` com toggle | Menos arquivos, mas contradiz o SDD §5.2 | |

**User's choice:** `/login` e `/register` separadas

### Campos do formulário de cadastro

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Nome + e-mail + senha | Passar o nome no `signUp()` preenche `profile.display_name` corretamente via trigger | ✓ |
| Só e-mail + senha | `display_name` cai no fallback derivado do e-mail; nomes feios nas listas depois | |
| Nome + e-mail + senha + confirmar senha | Dá um validador cross-field genuíno para o ID23 | |

**User's choice:** Nome + e-mail + senha
**Notes:** Verificado no SQL durante a discussão — o trigger lê exatamente `raw_user_meta_data ->> 'display_name'`, com `coalesce` para `split_part(email,'@',1)`. Errar a chave não dá erro, só ativa o fallback silenciosamente.

### Visual das telas de auth

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Card centrado, seguindo o `app.html` atual | `min-h-dvh`, `max-w-md`, card Spartan; consistente com o scaffold | ✓ |
| Tela cheia sem card | Mais limpo em mobile, mas abandona o padrão já estabelecido | |
| Você decide | Deixar para o planner/UI-SPEC | |

**User's choice:** Card centrado, seguindo o `app.html` atual

---

## Validação dos Reactive Forms e mensagens de erro

### Regra de senha

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Mínimo 6 caracteres | Casa com o mínimo padrão do Supabase Auth; cliente e servidor concordam | ✓ |
| Mínimo 8 caracteres | Mais rigoroso, mas é regra inventada que precisa justificativa | |
| Mínimo 8 + letra e número | Validação customizada mais rica, ao custo de atrito na demo ao vivo | |

**User's choice:** Mínimo 6 caracteres

### Timing da mensagem de erro

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Após sair do campo ou tentar submeter | `invalid && (touched \|\| submetido)`; padrão de UX menos irritante | ✓ |
| Imediatamente ao digitar | `invalid && dirty`; acusa erro desde a primeira letra | |

**User's choice:** Após sair do campo ou tentar submeter

### Tradução dos erros do Supabase

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Mapa PT-BR dos casos conhecidos + fallback | Cumpre a regra de UI em PT-BR sem engolir erros inesperados | ✓ |
| Mostrar a mensagem crua | Zero trabalho, mas interface em inglês contradiz o CLAUDE.md | |
| Mensagem genérica única | Simples, mas quem usa e-mail repetido não entende o que houve | |

**User's choice:** Mapa PT-BR dos casos conhecidos + fallback genérico

### Estado do botão durante a requisição

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Desabilitado se inválido OU em andamento, com texto de carregamento | Entrega ID23 e previne duplo clique criando duas contas | ✓ |
| Só desabilitado quando inválido | Mínimo do ID23, mas duplo clique dispara dois `signUp()` | |

**User's choice:** Desabilitado se inválido OU em andamento

---

## Shell autenticado, logout e redirect pós-login

### Onde vive o botão de logout

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Header em rota de layout autenticado | `authGuard` no pai uma única vez; atende AUTH-04 estruturalmente; demonstra ID17 | ✓ |
| Componente de header compartilhado por página | Mais simples, mas cada página nova precisa lembrar do guard e do import | |
| Só na `/dashboard` por enquanto | Mínimo, mas AUTH-04 fala em "qualquer página autenticada" | |

**User's choice:** Header em rota de layout autenticado

### Redirect pós-login e pós-cadastro

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Ambos para `/dashboard` | Com "Confirm email" desabilitado, `signUp()` já devolve sessão; fluxo mais curto na banca | ✓ |
| Login → `/dashboard`; cadastro → `/login` com aviso | Mais próximo de um fluxo com confirmação real, mas adiciona um passo | |

**User's choice:** Ambos para `/dashboard`

### Preservar a URL pretendida

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Sim, via `returnUrl` | Importa na Fase 3: deep link `/join/:token` sem login deve voltar ao grupo | ✓ |
| Não, sempre `/dashboard` | Mais simples agora, mas exige refatorar login e guard na Fase 3 | |

**User's choice:** Sim, via `returnUrl`

### Conteúdo da /dashboard na Fase 2

| Opção | Descrição | Selecionada |
|--------|-------------|----------|
| Placeholder mínimo autenticado | Saudação do Signal + botão sair; prova guard, sessão e logout | ✓ |
| Já com estrutura das listas de grupos vazias | Seria escopo adiantado (GRP-* é Fase 3) | |

**User's choice:** Placeholder mínimo autenticado

---

## Claude's Discretion

Nenhuma pergunta foi respondida com "Você decide". As áreas de discrição listadas em
CONTEXT.md foram inferidas por ausência (detalhes que nenhuma pergunta cobriu):
nomes exatos de arquivos, lazy loading das rotas, localização do mapa de tradução de erros,
composição visual fina, e quais `.spec.ts` escrever nesta fase.

## Deferred Ideas

- Documentar no README que "Confirm email" está desabilitado (PITFALLS.md Pitfall 9) — Fase 5 ou `/gsd:quick`
- Recuperação de senha — não está em AUTH-01..06 nem no PRD
- Login social — explicitamente Fora de Escopo em PROJECT.md
- Página de perfil / editar `display_name` e `avatar_url` — fora dos requisitos v1
- Interceptors funcionais (ID22) e `toSignal()` (ID24) — Fase 3
