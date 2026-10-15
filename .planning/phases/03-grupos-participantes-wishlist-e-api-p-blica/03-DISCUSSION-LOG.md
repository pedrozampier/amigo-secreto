# Phase 3: Grupos, Participantes, Wishlist e API Pública - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-15
**Phase:** 03-grupos-participantes-wishlist-e-api-p-blica
**Areas discussed:** Convite/RLS, Estado reativo, Wishlist, BrasilAPI, Tela de join, Erros
de join, Escopo da wishlist, Falha de API, Rotas, Guard/Resolver, Dashboard, Ícones, Link de
convite, Testes, Organização do trabalho

---

## Convite / RLS

Bloqueador descoberto no scout: as policies da Fase 1 não permitem entrar num grupo por
convite (quem não é membro não lê o grupo pelo token, e o INSERT em `participant` filtra
`group` sob RLS).

| Option | Description | Selected |
|--------|-------------|----------|
| RPC `join_group_by_token` | Função plpgsql SECURITY DEFINER valida token + status e insere numa transação. Zero policy nova. | ✓ |
| Nova policy de SELECT em `group` por token | Mantém tudo client-side, mas expõe a linha do grupo a quem tiver o token | |
| Migration mínima nas duas policies | Cirúrgico, mas espalha a regra em duas policies | |

**User's choice:** RPC `join_group_by_token`
**Notes:** Vira D-01. Concretiza o comentário de ARCHITECTURE.md:224 ("validação feita no
serviço/RPC"), que a Fase 1 nunca implementou.

---

## Tela de join

| Option | Description | Selected |
|--------|-------------|----------|
| Segundo RPC de preview | `preview_group_by_token()` devolve só nome + status; confirmação deliberada | ✓ |
| Entrar automaticamente ao abrir o link | Menos código, mas refresh acidental vira erro GRP-07 | |
| Tela genérica sem nome do grupo | Zero exposição, mas a pessoa confirma às cegas | |

**User's choice:** Segundo RPC de preview
**Notes:** Vira D-02, com a restrição explícita de nunca passar a devolver participantes.

---

## Erros de join (GRP-07 / GRP-08)

| Option | Description | Selected |
|--------|-------------|----------|
| RPC devolve código, Angular traduz | Códigos estáveis em inglês + mapa PT-BR, padrão de `auth-error-messages.ts` | ✓ |
| RPC lança exception com mensagem PT-BR | Menos código no Angular, mas põe texto de UI no banco | |
| Confiar no erro bruto da constraint | Zero código, mensagem incompreensível | |

**User's choice:** RPC devolve código, Angular traduz
**Notes:** Vira D-03/D-04. Mantém o split de idioma do CLAUDE.md.

---

## Estado reativo

| Option | Description | Selected |
|--------|-------------|----------|
| Signals no GroupService + refetch | Uma fonte de verdade, sem cache a invalidar | ✓ |
| Update otimista no signal local | UI mais rápida, mas lógica de rollback sem indicador novo | |
| Resolver re-executado por navegação | Menos código, comportamento implícito | |

**User's choice:** Signals no GroupService + refetch
**Notes:** Vira D-05/D-06. Casa com `check:no-rxjs-state`.

---

## Wishlist

| Option | Description | Selected |
|--------|-------------|----------|
| Dentro da tela do grupo | `wish_list` vive em `participant` — escopo por grupo fica óbvio | ✓ |
| Rota própria `/group/:id/wishlist` | Mais uma filha pro ID17, mas navegação para um único textarea | |
| Página única `/wishlist` com seletor | Centraliza, mas sugere que a lista é do perfil — engana na defesa oral | |

**User's choice:** Dentro da tela do grupo
**Notes:** Vira D-11, com `model()` entregando ID11.

---

## Escopo da edição de wishlist

| Option | Description | Selected |
|--------|-------------|----------|
| Travar só no service | `.update({ wish_list })` e nada mais; WISH-03 já garantido pela policy | ✓ |
| Trigger BEFORE UPDATE no banco | Defesa em profundidade, mas é a classe de robustez já adiada em V2-02 | |
| Deixar como está, sem nota | Perde a chance de registrar a limitação conhecida | |

**User's choice:** Travar só no service
**Notes:** Vira D-17, com a limitação registrada junto de V2-02.

---

## BrasilAPI — posicionamento

| Option | Description | Selected |
|--------|-------------|----------|
| Card no dashboard com `@defer` | Visível no login, independente de grupo, entrega ID8 de quebra | ✓ |
| Faixa no header do layout autenticado | Máxima visibilidade, mas incompatível com `on viewport` e rouba espaço em 320px | |
| Dentro da tela de gestão do grupo | Só aparece para admin de grupo — esconde o ID19 atrás de um fluxo | |

**User's choice:** Card no dashboard com `@defer`
**Notes:** Vira D-12.

---

## Falha da API

| Option | Description | Selected |
|--------|-------------|----------|
| Interceptor loga + card mostra erro | Centraliza em ID22, card com erro discreto em PT-BR | ✓ |
| Fallback calculando 25/12 local | Nunca mostra erro, mas torna o ID19 decorativo | |
| Esconder o card em caso de falha | Dashboard limpo, mas a feature some sem explicação offline | |

**User's choice:** Interceptor loga + card mostra erro
**Notes:** Vira D-14/D-15/D-16.

---

## Rotas

| Option | Description | Selected |
|--------|-------------|----------|
| `/group` aninhado, `join` flat | Layout de grupo só para membros; atualiza SDD §5.2 no mesmo commit | ✓ |
| Tudo sob `/group`, inclusive join | Mais uma filha pro ID17, mas renderiza header de grupo para não-membro | |
| Tudo flat conforme SDD §5.2 | Mantém o SDD intacto, mas perde a hierarquia real do ID17 | |

**User's choice:** `/group` aninhado, `join` flat
**Notes:** Vira D-07, com a obrigação documental de atualizar `docs/sdd.md` §5.2.

---

## Guard / Resolver

| Option | Description | Selected |
|--------|-------------|----------|
| Resolver busca, guard lê o resultado | Uma query; preserva "guard decide SE / resolver decide O QUE" | ✓ |
| Queries separadas | Autocontidos, mas duas roundtrips por navegação | |
| Só resolver, sem adminGuard | Menos arquivos, mas perde o adminGuard mapeado no ID18 | |

**User's choice:** Resolver busca, guard lê o resultado
**Notes:** Vira D-08/D-09.

---

## Dashboard (GRP-09)

| Option | Description | Selected |
|--------|-------------|----------|
| Duas seções empilhadas | `@for` + `track` duas vezes; separação explícita que GRP-09 pede | ✓ |
| Lista única com badge de papel | Menos scroll, mas um badge é mais fraco que "separadamente" | |
| Abas alternando entre os dois | Compacto, mas esconde metade atrás de um clique | |

**User's choice:** Duas seções empilhadas
**Notes:** Vira D-10.

---

## Ícones

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, lucide onde ajuda | Já na tabela §2 e instalado; melhora botões de ícone-único em 320px | ✓ |
| Não, só texto nesta fase | Menos imports, botões verbosos no mobile | |
| Só no botão de copiar link | Conservador, mas vira inconsistência na Fase 4 | |

**User's choice:** Sim, lucide onde ajuda
**Notes:** Vira D-13.

---

## Link de convite (GRP-03)

| Option | Description | Selected |
|--------|-------------|----------|
| `window.location.origin` em runtime | Funciona em local/preview/produção; a URL da Vercel é por-deployment | ✓ |
| Variável `appUrl` no environment | Explícito, mas o arquivo é git-ignored e gerado por script | |
| Copiar só o token | Evita o problema de URL, mas perde o deep link | |

**User's choice:** `window.location.origin` em runtime
**Notes:** Vira D-19.

---

## Testes

| Option | Description | Selected |
|--------|-------------|----------|
| Só onde há regra real | Mapa de erros do join + cálculo de dias até o Natal; lógica pura | ✓ |
| Nenhum teste nesta fase | Fase 3 enxuta, Fase 4 acumula | |
| Cobertura ampla do GroupService | Mock de supabase-js verboso; testa o mock, não a regra | |

**User's choice:** Só onde há regra real
**Notes:** Vira D-20. ENG-02/03 continuam formalmente na Fase 4.

---

## Organização do trabalho

| Option | Description | Selected |
|--------|-------------|----------|
| Trilha Supabase + trilha API em paralelo | Duas PRs reais; ID26 grada colaboração ativa | ✓ |
| Sequencial, API no fim | Mais fácil de acompanhar, desperdiça o paralelismo | |
| API pública primeiro | Valida HttpClient cedo, mas adia o núcleo que a Fase 4 bloqueia | |

**User's choice:** Trilha Supabase + trilha API em paralelo
**Notes:** Vira D-21.

---

## Claude's Discretion

Áreas deixadas ao critério de implementação (ver CONTEXT.md §Claude's Discretion):
nomes de arquivos/componentes, assinatura de retorno dos RPCs, validação do form de criar
grupo, confirmação ao remover participante, quais primitivas Spartan gerar, composição
visual fina.

## Deferred Ideas

- Trigger `BEFORE UPDATE` em `participant` restringindo a edição a `wish_list` (junto de V2-02)
- Convite nominal por e-mail / tabela `invite` (já Fora de Escopo)
- Página de perfil / editar `display_name` global
- Avatar por participante (V2-04)
- Documentar "Confirm email" desabilitado no README (Fase 5 / ENG-07)
- Sugestões de presente via API externa (desnecessário — BrasilAPI cobre ID19)
