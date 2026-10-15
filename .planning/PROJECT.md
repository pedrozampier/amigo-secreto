# UTF-Secret — Sistema de Amigo Secreto Online

## O Que É Isto

O **UTF-Secret** é uma aplicação web (PWA) de Amigo Secreto onde um organizador cria um
grupo, convida participantes por link e realiza o sorteio de forma automatizada e
**privada**: cada participante vê apenas o próprio par sorteado, e nem o administrador
tem acesso aos pares.

É o **projeto final** da disciplina *Desenvolvimento de Aplicações Front-End com
Frameworks e Componentes* (último semestre). Portanto tem dois públicos simultâneos:
quem usa o sistema (organizadores e participantes de um amigo secreto) e quem o avalia
(o professor, via rubrica de 32 indicadores).

## Core Value

O sorteio é privado de verdade — garantido pelo banco de dados (RLS), não pela interface —
e cada indicador do checklist RA1–RA8 é comprovadamente cumprido no código entregue.

## Requisitos

### Validados

- [x] Scaffold Angular 17+ standalone funcionando, com Tailwind e deploy na Vercel — *validado na Fase 1*
- [x] Banco Supabase modelado (`profile`, `group`, `participant`, `draw`) com RLS ativa — *validado na Fase 1*
- [x] Autenticação completa via Supabase Auth (cadastro, login, sessão persistente, logout) — *validado na Fase 2*
- [x] Administrador cria grupo e gera link de convite — *validado na Fase 3*
- [x] Participante entra no grupo via link de convite — *validado na Fase 3*
- [x] Administrador vê e remove participantes do seu grupo — *validado na Fase 3*
- [x] Participante cadastra e edita a própria lista de desejos — *validado na Fase 3*
- [x] Sorteio executado em Edge Function, uma única vez, sem auto-sorteio — *validado na Fase 4*
- [x] Participante vê o próprio par sorteado de forma oculta (revelação deliberada) — *validado na Fase 4*
- [x] Participante vê a lista de desejos de quem tirou — *validado na Fase 4*
- [x] Testes unitários (`.spec.ts`) cobrindo as regras de negócio do sorteio — *validado na Fase 4*

### Ativos

- [ ] PWA instalável (manifest, ícones, tema, standalone, estado offline)
- [ ] Interface mobile-first responsiva a partir de 320px, acessível (WCAG 2.1 AA)
- [ ] Protótipo navegável no Figma com link público no repositório
- [ ] README consolidando o PRD (diagrama ER em Mermaid + design system)
- [ ] User stories cadastradas como Issues em um Kanban no GitHub Projects

### Fora de Escopo

- Notificações por SMS — custo e complexidade, não agrega ao objetivo da disciplina
- Login social (Google/Facebook) — o MVP usa apenas e-mail/senha, conforme PRD
- Chat entre participantes — fora do núcleo de valor
- Sorteio com restrições de pares ("A não pode tirar B") — aumenta a complexidade do
  algoritmo sem demonstrar nenhum indicador adicional do checklist
- Aplicativo mobile nativo (iOS/Android) — apenas web responsivo + PWA
- Pagamentos ou controle de valor do presente — fora de escopo
- Histórico de sorteios anteriores — fora de escopo do MVP

## Contexto

**O projeto já tem especificação, mas zero código.** O repositório contém apenas
documentos; não existe `package.json` nem `src/`. O scaffold do Angular é o primeiro
trabalho real.

Documentos existentes (fonte da verdade, não reinventar):

- `docs/prd.md` — visão, glossário, atores, user stories, regras de negócio, não-objetivos
- `docs/sdd.md` — stack com versões, diagrama ER, contratos TypeScript, estrutura de
  pastas, mapa de rotas, políticas de RLS, algoritmo de sorteio
- `docs/checklist.md` — a **rubrica de avaliação** (RA1–RA8, IDs 1 a 32)

O checklist é o que diferencia este projeto de um CRUD comum: vários indicadores exigem
APIs *específicas* do Angular moderno, então a forma "óbvia" ou antiga de escrever algo
costuma ser a resposta errada aqui. Quando houver duas implementações que funcionam,
escolher a que demonstra um indicador.

Indicadores que impõem APIs obrigatórias:

| Indicador | Exigência |
|:----------|:----------|
| ID3 | Componentes **Standalone**, nunca `NgModule` |
| ID5, ID6 | `@if` / `@switch` / `@for` — e `@for` **sempre** com `track` |
| ID7 | Pipes (nativos ou customizados) |
| ID8 | `@defer` (Deferrable Views) em pelo menos um componente pesado |
| ID9–ID12 | **Signals** como única fonte de estado: `signal()`, `computed()`, `effect()`, `model()` |
| ID13 | Funções `input()` / `output()`, não os decoradores `@Input()` / `@Output()` |
| ID14 | `inject()`, nunca injeção via construtor |
| ID15–ID18 | `provideRouter` + `withComponentInputBinding`, params como inputs, rotas filhas, guards funcionais e resolvers |
| ID19–ID21 | GET em API pública + CRUD completo no BaaS |
| ID22 | **Interceptors funcionais** para token e erro centralizado |
| ID23 | Reactive Forms com validação e submit desabilitado quando inválido |
| ID24 | `toSignal()` / `toObservable()` fazendo a ponte RxJS ↔ Signals |
| ID25–ID27 | Gitflow (`main` + `develop`), Pull Requests, build e deploy automatizado |
| ID28–ID32 | SDD: user stories como Issues, PRD no README, `.spec.md`, MCP + Skills, testes gerados e revisados |

## Restrições

- **Stack**: fixa conforme `docs/sdd.md` §2 — Angular 17+, Supabase JS ^2.x, Tailwind ^3.x,
  Spartan UI (HLM), Lucide Angular, date-fns ^3.x, Zod ^3.x, Vercel. O SDD é explícito:
  nenhuma dependência externa pode ser instalada sem refletir naquela tabela primeiro.
- **Complexidade**: o usuário pediu explicitamente um projeto **simples e fácil de
  explicar**, com **poucas fases**. Simplicidade é requisito, não preferência — o projeto
  precisa ser defensável numa apresentação oral.
- **Avaliação**: cobertura dos 32 indicadores do checklist é obrigatória. Um indicador não
  demonstrado é nota perdida, mesmo que o sistema funcione.
- **Privacidade**: os pares sorteados precisam ser inacessíveis ao administrador no nível
  do banco (RLS), não escondidos na UI. É o diferencial técnico do projeto.
- **Idioma**: documentação e textos de interface em **português do Brasil**; identificadores
  de código, entidades de banco e mensagens de commit em **inglês** (mapeamento PT-BR → EN
  em `docs/sdd.md` §3.1).
- **Git**: Gitflow simplificado com `main` + `develop` e integração por Pull Request — o
  próprio fluxo é avaliado (ID25–ID26). Não commitar direto na `main`.

## Decisões-Chave

| Decisão | Racional | Resultado |
|---------|----------|-----------|
| Reaproveitar PRD/SDD existentes como fonte da verdade | Já estão escritos, aprovados e commitados; reescrever geraria divergência | — Pendente |
| Sorteio em Supabase Edge Function, não no cliente | Se o sorteio rodasse no browser do admin, os pares passariam pela máquina dele — quebraria o core value | — Pendente |
| RLS como mecanismo de privacidade (não a UI) | Esconder na interface não é segurança; a política no banco é verificável e demonstrável | — Pendente |
| Granularidade grossa (poucas fases amplas) | Pedido explícito do usuário: simples e fácil de explicar | — Pendente |
| Pares circulares (Fisher-Yates + rotação) | Garante matematicamente que ninguém tira a si mesmo, sem retentativas; trivial de explicar numa banca | — Pendente |
| Sem login social no MVP | PRD define e-mail/senha; OAuth não demonstra nenhum indicador adicional | ✓ Validado na Fase 2 — AUTH-01/02 entregues com e-mail/senha |
| Sessão como Signal tri-estado (`loading`/`authenticated`/`unauthenticated`), não booleano | Um booleano não distingue "ainda carregando" de "deslogado", o que é exatamente a causa do flash de `/login` no F5 | ✓ Validado na Fase 2 — `provideAppInitializer` aguarda `initialize()`, tornando o flash estruturalmente impossível |
| "Confirm email" desativado no Supabase | Sem ele, `signUp` devolve `session: null` sem erro e o redirect para `/dashboard` é revertido em silêncio pelo guard; e a banca não deve depender de round-trip de e-mail | ✓ Decidido na Fase 2 (D-20) — `mailer_autoconfirm: true`; fragilidade residual registrada em `deferred-items.md` |

## Evolução

Este documento evolui nas transições de fase e nos limites de milestone.

**Após cada transição de fase** (via `/gsd:transition`):
1. Requisitos invalidados? → Mover para Fora de Escopo com o motivo
2. Requisitos validados? → Mover para Validados com referência à fase
3. Novos requisitos surgiram? → Adicionar em Ativos
4. Decisões a registrar? → Adicionar em Decisões-Chave
5. "O Que É Isto" continua correto? → Atualizar se divergiu

**Após cada milestone** (via `/gsd:complete-milestone`):
1. Revisão completa de todas as seções
2. Checagem do Core Value — continua sendo a prioridade certa?
3. Auditoria do Fora de Escopo — os motivos continuam válidos?
4. Atualizar Contexto com o estado atual

---
*Última atualização: 2026-10-15 após conclusão da Fase 4 (Sorteio e Revelação) — Fases 1 a 4 completas e verificadas (5/5 critérios da Fase 4); 19 plans executados. O core value está PROVADO na prática, não só no código: a Edge Function `run-draw` está deployada e ACTIVE, um sorteio real rodou num grupo de 4 participantes, e a dupla assert de DRAW-10 foi medida em SQL com RLS ativa — a admin (que participa do próprio grupo desde a migration 0006) lê exatamente 1 das 4 linhas de `draw` (a própria) e 0 linhas ao filtrar pelo `giver_id` de outro participante. Evidência real em `docs/draw-privacy-verification.md`. Um gap de alcançabilidade (a tela de revelação não tinha link para não-admins) foi encontrado pelo smoke test humano — não pela suíte verde — e corrigido na quick task 261015-mbk. Pendente de verificação humana: responsividade em 320px e roteiro end-to-end com duas contas (`03-HUMAN-UAT.md`); pendente de limpeza: dados de teste no banco de produção (ver `deferred-items.md` da Fase 4); próximo: Fase 5 (PWA, Acessibilidade e Entrega)*
