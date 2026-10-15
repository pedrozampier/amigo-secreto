# 🛠️ Software Design Document (SDD)

**Projeto:** UTF-Secret — Sistema de Amigo Secreto Online
**Versão:** 1.0.0
**Status:** 🟡 Em Definição (MVP)

---

## 🤖 1. Orquestração e Contexto de IA (MCP)

> Servidores Model Context Protocol configurados na IDE agêntica (Claude Code).
> Requisito ENG-10 / indicador RA8-ID31.

### 1.1. Supabase MCP (obrigatório)

Servidor oficial hospedado, autenticação por OAuth — não há processo local para rodar.

```bash
claude mcp add --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=<PROJECT_REF>&read_only=true"
```

- `project_ref` restringe o servidor a **um único** projeto Supabase; com o escopo definido, as
  ferramentas de gestão de conta (criar/apagar outros projetos) ficam desabilitadas.
- `read_only=true` é o padrão de segurança que a própria Supabase recomenda e é a configuração
  do projeto entregue: permite inspecionar schema, policies de RLS e logs sem poder executar
  migrations destrutivas pelo canal MCP.
- **Caveat de segurança (documentado deliberadamente):** conceder a um agente acesso de escrita
  ao banco via MCP significa que qualquer prompt injection que atinja a sessão do agente — vindo
  de conteúdo web buscado, da descrição de uma Pull Request, ou de qualquer texto não confiável
  que o agente leia — pode tentar emitir SQL pela conexão MCP. O escopo de um único projeto
  somado a `read_only=true` é a mitigação, não a eliminação do risco. A conexão MCP deve ser
  tratada com a mesma desconfiança de qualquer credencial com raio de alcance, e nunca deve
  apontar para um projeto de produção com escrita habilitada por padrão.

### 1.2. Figma MCP (obrigatório)

Servidor oficial remoto (não exige o app desktop do Figma):

```bash
claude mcp add --transport http figma "https://mcp.figma.com/mcp"
```

Uso: copiar o link de um frame/layer no modo Dev do Figma e colar no contexto do agente para
extrair design tokens, cores, tipografia e hierarquia visual. O arquivo do protótipo é o mesmo
linkado no README por UI-07.

### 1.3. Angular CLI MCP (opcional, adicional)

Embutido no próprio Angular CLI — não é um pacote separado:

```bash
npx @angular/cli mcp --read-only
```

Expõe `list_projects`, `run_target` (build/test/lint), `search_documentation` e
`get_best_practices`. Não é exigido pelo ENG-10 (que nomeia Supabase e Figma), mas é
diretamente relevante num projeto avaliado pelo uso correto das APIs modernas do Angular.
Flags `--read-only` e `--local-only` disponíveis para limitar o alcance.

---

## 📦 2. Stack Tecnológica e Bibliotecas

> Definição estrita das tecnologias permitidas. Nenhuma dependência externa deve ser instalada sem refletir aqui.

| Categoria | Tecnologia | Versão |
|:----------|:-----------|:-------|
| **Core** | Angular (Standalone + Signals) | **^21.x (LTS)** |
| **BaaS & Auth** | Supabase JS | ^2.x |
| **Estilização** | Tailwind CSS | **^4.x** |
| **UI Components** | Spartan UI (HLM) | ^1.7.x |
| **UI Primitives** | Angular CDK (peer do Spartan) | ^21.x |
| **Ícones** | Lucide Angular | ^1.x |
| **Utilitários** | date-fns (datas) | ^3.x |
| **Validação** | Zod (schemas) | ^3.x |
| **Testes** | Vitest (padrão do Angular 21+) | — |
| **Deploy** | Vercel | — |
| **Utilitários (peer do Spartan)** | clsx (composição de classes) | ^2.x |
| **Datas (peer do Spartan)** | luxon (uso interno dos componentes de data do Spartan) | ^3.x |
| **Animações (peer do Spartan)** | tw-animate-css | ^1.x |

### 2.1. Changelog de Versões (decisões tomadas em 2026-10-14)

As versões acima foram revisadas contra o registry do npm. Duas mudanças em relação à
v1.0.0 deste documento, ambas decididas deliberadamente:

| Item | Antes | Agora | Motivo |
|:-----|:------|:------|:-------|
| Angular | `17+` | `^21.x` (LTS) | O ID31 do checklist pede "Skills de Angular 20+", e o Spartan UI exige `@angular/core >=21 <23`. A v21 é o LTS mais recente que satisfaz ambos e evita o conflito de peer do `lucide-angular` (que declara suporte até a 21.x). Em v21+ o projeto nasce *zoneless* e com **Vitest** no lugar do Karma. |
| Tailwind CSS | `^3.x` | `^4.x` | **Conflito bloqueante:** `@spartan-ng/brain@1.7.0` declara `peerDependencies.tailwindcss: ">=4.0.0"`. Manter o Tailwind 3 tornaria impossível instalar o Spartan UI (`ERESOLVE`). O guia oficial do Angular também só documenta o setup do v4. O ID4 do checklist pede apenas "um framework CSS moderno", então a troca não afeta a avaliação. |

**Consequência prática do Tailwind v4:** não existe mais `tailwind.config.js`. A
configuração passa a ser *CSS-first*: `@import "tailwindcss";` no `styles.css` e o tema
definido em um bloco `@theme { ... }`. O PostCSS usa o plugin `@tailwindcss/postcss`.

**Observação:** o Spartan UI também traz `luxon` como peer dependency. Isso convive sem
problema com o `date-fns` já adotado — o `luxon` é usado internamente por componentes de
data do Spartan, enquanto o `date-fns` continua sendo a biblioteca de datas da aplicação.

**Peers transitivos do Spartan UI (adicionados em 2026-10-14).** O `@spartan-ng/brain@1.7.0`
declara `clsx >=2.0.0`, `luxon >=3.0.0` e `tw-animate-css >=1.0.0` como peer dependencies.
Elas entram na tabela acima por força da regra "nenhuma dependência sem refletir aqui". O
`luxon` convive com o `date-fns` sem conflito: o `luxon` serve aos componentes de data internos
do Spartan, e o `date-fns` continua sendo a biblioteca de datas da aplicação. Nota de instalação
(plan 01-03): `luxon` está marcado `peerDependenciesMeta.optional: true` no `@spartan-ng/brain@1.7.0`
instalado — como a Fase 1 só gerou `button` e `card` (nenhum componente de data do Spartan), o
npm não o instalou automaticamente. Ele será instalado quando a primeira fase que usa um
componente de data do Spartan (ex. date-picker/calendar) o exigir; a entrada na tabela já
documenta a dependência com antecedência, conforme a regra do SDD.

**Primitivas Spartan UI geradas (atualizado na Fase 2).** O `libs/ui/` contém apenas as
primitivas efetivamente usadas, geradas sob demanda por `ng g @spartan-ng/cli:ui <nome>`:
`utils`, `button` e `card` (Fase 1) e `input` + `label` (Fase 2, para os Reactive Forms de
login e cadastro). Isso é **geração de código local**, não instalação de dependência: as
`peerDependencies` de `input` e `label` são apenas `@angular/core`, `@angular/forms` e
`@spartan-ng/brain`, todas já presentes na tabela §2 — `package.json` não muda ao gerá-las.

A primitiva `field` (o "form field" do Spartan) foi deliberadamente **não** gerada: ela
depende de `separator` e puxa `@ng-icons/core` + `@ng-icons/lucide` como peers, que não
constam da §2. Rótulo (`hlmLabel`) + campo (`hlmInput`) + um parágrafo de mensagem de erro
já atendem o ID23 do checklist sem ampliar a árvore de dependências.

---

## 🗄️ 3. Arquitetura de Dados

### 📖 3.1. Glossário Técnico (Mapeamento)

| Termo PRD (PT-BR) | Entidade Técnica (EN) | Atributos Principais |
|:------------------|:----------------------|:---------------------|
| Grupo | `group` | `id`, `name`, `admin_id`, `status`, `invite_token`, `created_at` |
| Participante | `participant` | `id`, `group_id`, `user_id`, `display_name`, `wish_list`, `joined_at` |
| Sorteio / Par Sorteado | `draw` | `id`, `group_id`, `giver_id`, `receiver_id`, `created_at` |
| Usuário | `profile` | `id`, `email`, `display_name`, `avatar_url` |

### 📊 3.2. Diagrama ER (Mermaid)

```mermaid
erDiagram
    PROFILE {
        uuid id PK
        text email
        text display_name
        text avatar_url
        timestamptz created_at
    }

    GROUP {
        uuid id PK
        text name
        uuid admin_id FK
        text status
        text invite_token
        int min_participants
        timestamptz created_at
    }

    PARTICIPANT {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        text display_name
        text wish_list
        timestamptz joined_at
    }

    DRAW {
        uuid id PK
        uuid group_id FK
        uuid giver_id FK
        uuid receiver_id FK
        timestamptz created_at
    }

    PROFILE ||--o{ GROUP : "admin_id (administra)"
    PROFILE ||--o{ PARTICIPANT : "user_id (participa)"
    GROUP ||--o{ PARTICIPANT : "group_id (contém)"
    GROUP ||--o{ DRAW : "group_id (gera)"
    PARTICIPANT ||--o{ DRAW : "giver_id (dá presente)"
    PARTICIPANT ||--o{ DRAW : "receiver_id (recebe presente)"
```

### 📌 3.3. Status do Grupo (State Machine)

```mermaid
stateDiagram-v2
    [*] --> open : Grupo criado
    open --> drawing : Admin inicia sorteio (mín. 3 participantes)
    drawing --> closed : Sorteio concluído
    closed --> [*]
```

---

## 📑 4. Contratos Globais (Interfaces & Types)

> Tipagem TypeScript baseada no banco de dados.

```typescript
export type GroupStatus = 'open' | 'drawing' | 'closed';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  admin_id: string;
  status: GroupStatus;
  invite_token: string;
  min_participants: number;
  created_at: string;
}

export interface Participant {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  wish_list?: string;
  joined_at: string;
}

export interface Draw {
  id: string;
  group_id: string;
  giver_id: string;
  receiver_id: string;
  created_at: string;
}

// View models para o frontend
export interface ParticipantWithProfile extends Participant {
  profile: Profile;
}

export interface MyDrawResult {
  receiver: Pick<Participant, 'display_name' | 'wish_list'>;
}
```

---

## 🏗️ 5. Scaffolding Macro (Arquitetura Frontend)

### 📂 5.1. Estrutura de Pastas Base

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── group.service.ts
│   │   │   └── draw.service.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   └── interceptors/
│   │       └── error.interceptor.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/
│   │   ├── group/
│   │   │   ├── create/
│   │   │   ├── manage/
│   │   │   └── join/
│   │   └── draw/
│   │       └── result/
│   └── shared/
│       ├── components/
│       │   ├── button/
│       │   ├── card/
│       │   └── modal/
│       └── pipes/
├── environments/
└── styles/
```

### 🚦 5.2. Mapa de Rotas e Páginas (Features)

| Rota | Page Component | Functional Guard |
|:-----|:---------------|:-----------------|
| `/login` | `features/auth/login/login.page.ts` | Público |
| `/register` | `features/auth/register/register.page.ts` | Público |
| `/dashboard` | `features/dashboard/dashboard.page.ts` | `authGuard` |
| `/group/create` | `features/group/create/create-group.page.ts` | `authGuard` |
| `/group/:id/manage` | `features/group/manage/manage-group.page.ts` | `authGuard` + `adminGuard` |
| `/join/:token` | `features/group/join/join-group.page.ts` | `authGuard` |
| `/draw/:groupId/result` | `features/draw/result/draw-result.page.ts` | `authGuard` |

### 🧠 5.3. Core Services (Singleton)

| Service | Arquivo | Responsabilidade Macro |
|:--------|:--------|:-----------------------|
| `AuthService` | `core/services/auth.service.ts` | Gerenciar sessão Supabase, estado do usuário logado (Signal) e fluxos de login/logout. |
| `GroupService` | `core/services/group.service.ts` | CRUD de grupos, geração de invite token, listagem de participantes. |
| `DrawService` | `core/services/draw.service.ts` | Executar algoritmo de sorteio, consultar par sorteado do usuário autenticado. |

---

## 🛡️ 6. Segurança (Supabase RLS)

> Políticas de acesso a nível de banco de dados — nenhum dado é exposto sem autenticação.

| Tabela | Política (RLS) |
|:-------|:---------------|
| `profile` | Usuário autenticado lê/edita apenas seu próprio perfil. |
| `group` | Admin lê e gerencia seus grupos. Participantes leem grupos que participam. |
| `participant` | Usuário lê todos os participantes do grupo que pertence. Edita apenas seus próprios dados. |
| `draw` | **Política crítica:** Participante (`giver_id`) lê **apenas sua própria linha** — nunca a de outro. Admin não possui acesso especial. |

---

## 📋 7. Algoritmo de Sorteio

O sorteio é executado em uma **Supabase Edge Function** (serverless) para garantir que a lógica não rode no cliente e nenhum par seja exposto:

```
1. Buscar todos os participant.id do grupo
2. Embaralhar a lista (Fisher-Yates shuffle)
3. Formar pares circulares: participante[i] → participante[i+1], último → primeiro
4. Garantir que nenhum participante tire a si mesmo
5. Inserir todos os pares na tabela `draw` em uma única transação
6. Atualizar group.status para 'closed'
```
