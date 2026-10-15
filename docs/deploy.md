# Evidência de Deploy — Fase 1

Este documento registra a evidência real de que o pipeline de entrega da Fase 1 funciona:
deploy automático a partir de `main`, deep link funcionando em produção (rewrite de SPA),
e ausência de secret key no bundle servido. Todos os valores abaixo foram observados
diretamente contra o projeto real (`curl`, `gh api`, comentários do bot da Vercel nas PRs) —
nenhum é hipotético.

## URL de Produção

```
https://amigo-secreto-45wxm00ln-zmp2.vercel.app
```

Confirmada como a URL de produção real via `target_url`/`environment_url` do deployment do
GitHub disparado pelo merge da PR #29 em `main` (deployment id `7082119882`, ver seção
"Deploy automático" abaixo).

**Aviso importante sobre o alias `amigo-secreto.vercel.app`:** esse subdomínio "óbvio" **não
é este projeto**. Ele resolve para um app Next.js de terceiros não relacionado — confirmado
ao abri-lo e encontrar HTML de uma aplicação Next (`next-head-count`, fontes do Google Fonts
carregadas por outro projeto), não o `index.html` do Angular. O projeto Vercel real deste
repositório vive no escopo da equipe `zmp2` (`https://vercel.com/zmp2/amigo-secreto`,
`projectId: prj_PJ2S1H96sovQ9GwKLU7uwYphFpTo`, visto nos comentários do bot do GitHub nas PRs
#28 e #29) e seu domínio de produção estável (`amigo-secreto.vercel.app`) está ocupado por
outra conta. Por isso a URL por-deployment acima é a referência autoritativa documentada aqui
— **não tentar "verificar" o deploy contra `amigo-secreto.vercel.app`**, isso testaria o site
de outra pessoa. Não foi determinado, dentro desta sessão, nenhum alias estável alternativo
sob o escopo `zmp2` além da URL por-deployment; se a Vercel atribuir um mais tarde, atualizar
esta seção.

## Configuração da Vercel

- **Build Command:** `npm run build` (via `vercel.json`, repositório `pedrozampier/amigo-secreto`)
- **Output Directory:** `dist/amigo-secreto/browser` (literal do `vercel.json`, confirmado
  existente localmente após `npm run build` — ver `01-04-PLAN.md` Task 1)
- **Production Branch:** `main`
- **Escopo/projeto Vercel:** `zmp2/amigo-secreto` (`projectId: prj_PJ2S1H96sovQ9GwKLU7uwYphFpTo`)
- **Variáveis de ambiente cadastradas na Vercel:** `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`
  (escopos Production e Preview). Nunca a chave secreta/administrativa do Supabase.
- **`prebuild` (geração de `environment.prod.ts`):** não foi possível inspecionar o log de
  build da Vercel diretamente nesta sessão de verificação; a evidência indireta de que o hook
  rodou é que o bundle servido em produção contém a aplicação Angular funcional com rotas
  resolvendo corretamente (ver "Deep Link" abaixo) — um build sem `environment.prod.ts`
  gerado teria falhado no passo `fileReplacements` do Angular, não produzido um 200. A chave
  publicável em si não aparece no chunk inspecionado (ver nota na seção de secrets).

## Deep Link

Testado contra a URL de produção listada acima (sem autenticação — a Vercel Deployment
Protection foi desabilitada para permitir esta verificação automatizada; ver "Decisão sobre
Deployment Protection" ao final):

```bash
curl -s -o /dev/null -w "%{http_code}" https://amigo-secreto-45wxm00ln-zmp2.vercel.app
# => 200

curl -s -o /dev/null -w "%{http_code}" https://amigo-secreto-45wxm00ln-zmp2.vercel.app/grupo/abc-123
# => 200

curl -s -o /dev/null -w "%{http_code}" https://amigo-secreto-45wxm00ln-zmp2.vercel.app/rota-inexistente
# => 200
```

Os dois deep links retornam **200**, não 404 — confirmando que o `rewrites` do `vercel.json`
(`"/(.*)" -> "/index.html"`) está sendo aplicado em produção. O HTML servido nessas rotas
contém `<app-root`, i.e. a Vercel devolve a shell da aplicação Angular (que o Angular Router
então resolve no cliente), não uma página de erro estática. Isso fecha o Pitfall 12
(deep link 404 por falta de rewrite de SPA).

## Verificação de Secrets (DB-11)

O `index.html` servido em produção referencia um único script:

```
main-GJECS65H.js
```

Baixado o `index.html` e esse chunk diretamente da URL de produção e aplicado grep:

```bash
curl -s https://amigo-secreto-45wxm00ln-zmp2.vercel.app/main-GJECS65H.js | grep -cE "<padrão da chave secreta/administrativa>"
# => 0

curl -s https://amigo-secreto-45wxm00ln-zmp2.vercel.app/main-GJECS65H.js | grep -cE "<padrão da chave publicável>"
# => 0
```

(Os padrões literais de grep usados foram os mesmos dois prefixos/identificadores que o gate
de CI em `.github/workflows/ci.yml` já usa contra `dist/` — omitidos aqui, só na forma de
contagem, para que este documento nunca contenha o texto exato de uma credencial, mesmo como
substring de busca.)

A contagem da chave secreta/administrativa é **0** — nenhuma secret key no bundle que chega
ao navegador. Isso satisfaz DB-11 do lado do bundle de produção real (não apenas o `dist/`
local).

**Nota honesta sobre o segundo resultado:** o grep pela chave *publicável* (`sb_publishable_`)
também retornou 0. Isso é esperado nesta fase, não um defeito: o scaffold da Fase 1 ainda não
instancia o cliente `supabase-js` em código de aplicação (isso é trabalho da Fase 2+), então
nenhuma chave — secreta ou publicável — é referenciada no bundle ainda. Não interpretar essa
ausência como "a chave publicável foi verificada presente"; ela simplesmente não é consumida
por nenhum código ainda.

## Gitflow (ENG-06)

Duas Pull Requests reais, mescladas, materializam o fluxo exigido pela rubrica:

1. **PR #28** — `gsd/phase-01-fundacao-scaffold-banco-rls` → `develop`
   https://github.com/pedrozampier/amigo-secreto/pull/28
   CI verde, mesclada.

2. **PR #29** — `develop` → `main`
   https://github.com/pedrozampier/amigo-secreto/pull/29
   CI verde, mesclada. Este é o merge que disparou o deploy de produção (ver próxima seção).

Confirmação de que `main` não recebeu nenhum commit direto nesta fase —
`git log origin/main --first-parent --oneline -4` retorna apenas commits de merge:

```
fd22ba2 Merge pull request #29 from pedrozampier/develop
1959f54 Merge pull request #14 from pedrozampier/develop
5492348 Merge pull request #13 from pedrozampier/develop
47bb3d7 Initial commit
```

Toda a história de `main` é composta por merges de Pull Request (mais o commit inicial do
repositório). RA7-ID25/ID26 (branches `main`+`develop`, integração via PR) estão satisfeitos.

## Deploy automático (ENG-05)

O merge da PR #29 em `main` (commit `fd22ba2`) disparou automaticamente um deployment de
Produção na Vercel, confirmado via GitHub Deployments API:

- **Deployment GitHub:** id `7082119882`
- **Commit:** `fd22ba298fec90667c358f73c3b611fdcdd835c7` (merge da PR #29)
- **Ambiente:** `Production`
- **Estado:** `success`
- **Timestamp:** `2026-10-15T02:18:17Z`
- **URL do deployment:** `https://amigo-secreto-45wxm00ln-zmp2.vercel.app`

Isso prova ENG-05 literalmente como escrito: um push (via merge) em `main` dispara um deploy
automático, sem intervenção manual além de clicar "Merge" na PR.

## Decisão sobre Deployment Protection

Por padrão a Vercel protege deployments de Preview/Production com uma tela de autenticação
(Vercel Deployment Protection), o que bloquearia tanto o `curl` automatizado de verificação
quanto o acesso direto do professor avaliador à URL de produção sem login na Vercel. Como
este é um projeto acadêmico cujo avaliador precisa conseguir abrir a URL livremente — e cuja
privacidade real já é garantida no nível certo (RLS no banco, não por uma tela de login do
provedor de hosting) — a Deployment Protection foi **desabilitada deliberadamente** para este
projeto, antes de executar as verificações de deep link e de secrets desta página.

## Resumo de requisitos atendidos

| Critério | Evidência |
|---|---|
| Push (merge) em `main` dispara deploy | Deployment GitHub `7082119882`, estado `success` |
| Deep link direto não dá 404 | `/grupo/abc-123` e `/rota-inexistente` → `200`, `<app-root` presente |
| Nenhuma secret key no bundle de produção | grep do padrão da chave secreta/administrativa no chunk servido → `0` |
| `develop` existe e há PR mesclada | `git ls-remote --heads origin develop`; PR #28 e #29 mescladas |
| `main` só recebe merge commits | `git log origin/main --first-parent` só mostra `Merge pull request` |
