# 📋 Kanban — UTF-Secret

> Evidência de ENG-08 (RA8-ID28): board no GitHub Projects populado com uma Issue real por
> user story do PRD §4, desde o início do desenvolvimento — não na semana da entrega.

## Board

**URL:** https://github.com/users/pedrozampier/projects/3

Projeto "UTF-Secret Kanban" (Projects v2, público), criado em 2026-10-14 via `gh project create`.

## Issues

11 Issues reais (não draft items), cada uma correspondendo a uma user story do PRD §4,
rastreada a requisitos e à fase do ROADMAP em que será implementada.

| # | Issue | Labels | Requisitos rastreados | Fase |
|---|---|---|---|---|
| 1 | [US01 - Criar conta no sistema](https://github.com/pedrozampier/amigo-secreto/issues/1) | `user-story`, `auth` | AUTH-01, AUTH-06 | 2 |
| 2 | [US02 - Fazer login na conta](https://github.com/pedrozampier/amigo-secreto/issues/2) | `user-story`, `auth` | AUTH-02, AUTH-03 | 2 |
| 3 | [US03 - Criar um grupo de Amigo Secreto](https://github.com/pedrozampier/amigo-secreto/issues/3) | `user-story`, `grupo` | GRP-01 | 3 |
| 4 | [US04 - Gerar link de convite para o grupo](https://github.com/pedrozampier/amigo-secreto/issues/4) | `user-story`, `grupo` | GRP-02, GRP-03 | 3 |
| 5 | [US05 - Visualizar lista de participantes do grupo](https://github.com/pedrozampier/amigo-secreto/issues/5) | `user-story`, `grupo` | GRP-04 | 3 |
| 6 | [US06 - Remover participante do grupo](https://github.com/pedrozampier/amigo-secreto/issues/6) | `user-story`, `grupo` | GRP-05 | 3 |
| 7 | [US07 - Iniciar o sorteio do grupo](https://github.com/pedrozampier/amigo-secreto/issues/7) | `user-story`, `sorteio` | DRAW-01, DRAW-04, DRAW-07 | 4 |
| 8 | [US08 - Entrar em grupo via link de convite](https://github.com/pedrozampier/amigo-secreto/issues/8) | `user-story`, `grupo` | GRP-06, GRP-07, GRP-08 | 3 |
| 9 | [US09 - Visualizar resultado do sorteio de forma oculta](https://github.com/pedrozampier/amigo-secreto/issues/9) | `user-story`, `sorteio` | DRAW-08, DRAW-10 | 4 |
| 10 | [US10 - Cadastrar lista de desejos](https://github.com/pedrozampier/amigo-secreto/issues/10) | `user-story`, `wishlist` | WISH-01 | 3 |
| 11 | [US11 - Ver lista de desejos de quem tirei](https://github.com/pedrozampier/amigo-secreto/issues/11) | `user-story`, `wishlist` | DRAW-09, WISH-03 | 4 |

Todas as 11 Issues foram adicionadas ao board (`gh project item-add`) e estão na coluna "Todo"
por padrão (aguardando priorização conforme as fases do ROADMAP avançam).

**Nota sobre duplicação detectada e corrigida nesta plan:** as Issues #1–#11 já existiam no
repositório (criadas em preparo anterior ao planejamento desta fase), com os mesmos critérios
de aceite das 11 user stories do PRD §4, porém sem a seção "Requisitos rastreados" e sob um
esquema de labels diferente (`autenticação`/`gestão-de-grupos`/`participação` em vez de
`auth`/`grupo`/`sorteio`/`wishlist`). Ao executar esta plan, Issues novas (#17–#27) foram
criadas antes de notar a duplicata; foram fechadas como "not planned" com comentário
explicativo, removidas do board, e as Issues originais (#1–#11) foram atualizadas com a
rastreabilidade de requisitos e com os labels adicionais previstos na plan, evitando um
backlog duplicado. Duas Issues adicionais fora do escopo das 11 user stories do PRD
(#12 "Dashboard central de grupos" e #16 "US13 - Ver contagem de dias até o Natal") também já
existiam no repositório com o label `user-story`; foram deixadas como estão (trabalho futuro
de UI/API pública), mas não fazem parte da contagem de 11 e não foram adicionadas ao board
por esta plan.

## Evidência de Gitflow

Saída de `git branch -r` (2026-10-14, após `git fetch origin`):

```
origin/HEAD -> origin/main
origin/develop
origin/feature/project-planning
origin/main
```

`origin/develop` já existia no remoto (não foi necessário criá-la).

Saída de `git log origin/main --oneline -20`:

```
1959f54 Merge pull request #14 from pedrozampier/develop
267a73e update README.md
5492348 Merge pull request #13 from pedrozampier/develop
4e5e435 docs: add SDD - Software Design Document with ER diagram
51fed11 docs: add PRD - Product Requirements Document
47bb3d7 Initial commit
```

Saída de `git log origin/main --merges --oneline -10`:

```
1959f54 Merge pull request #14 from pedrozampier/develop
5492348 Merge pull request #13 from pedrozampier/develop
```

**Conclusão:** `origin/main` tem exatamente 6 commits, dos quais os 3 commits posteriores ao
commit inicial (`51fed11`, `4e5e435`) chegaram via merge de Pull Request (`#13`, `#14`) a
partir de `develop`. Não há nenhum commit direto em `main` fora do histórico linear inicial
anterior à adoção formal do Gitflow neste projeto — `main` só recebe integração via PR, conforme
RA7-ID25/ID26. `develop` está um commit adiante de `main` na branch mais recente (`4616b16`),
aguardando a próxima PR de integração.

## Método

Caminho `gh` CLI (não foi necessário o fallback manual via UI web).

- `gh --version` → `2.45.0`, presente.
- `gh auth status` já listava o escopo `project` (obtido em sessão anterior) — não foi
  necessário rodar `gh auth refresh -s project`.
- Board criado com `gh project create --owner "@me" --title "UTF-Secret Kanban" --format json`
  → `number: 3`, `url: https://github.com/users/pedrozampier/projects/3`.
- Visibilidade alterada para pública com `gh project edit 3 --owner "@me" --visibility PUBLIC`.
- Labels criados/confirmados com `gh label create "$L" --force` para `user-story`, `auth`,
  `grupo`, `sorteio`, `wishlist`.
- Issues #1–#11 (pré-existentes) atualizadas com `gh issue edit --body` (acrescentando a seção
  "Requisitos rastreados") e `gh issue edit --add-label`, depois adicionadas ao board com
  `gh project item-add 3 --owner "@me" --url <issue-url>`.
