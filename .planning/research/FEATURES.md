# Feature Research

**Domínio:** Aplicativo web de Amigo Secreto / Troca de Presentes (Secret Santa)
**Pesquisado em:** 2026-10-14
**Confiança:** HIGH (table stakes e padrões de mercado) / MEDIUM (recomendações de UX, baseadas em fontes de design não específicas de Angular) / HIGH (API pública, testada em produção via curl nesta data)

## Contexto da Pesquisa

Este não é um produto comercial: é o projeto final de uma disciplina de front-end,
com uma restrição dupla e inegociável definida em `.planning/PROJECT.md` e `docs/prd.md`:

1. **Simplicidade deliberada** — poucas fases, fácil de explicar numa banca oral.
2. **Rubrica de 32 indicadores** (`docs/checklist.md`) — uma funcionalidade que existe só
   para demonstrar um indicador (ID7 Pipes, ID8 `@defer`, ID19 API pública) é legítima
   *desde que* se encaixe organicamente na história do produto, sem inflar o escopo.

O PRD já exclui explicitamente: chat, restrições de pares, múltiplas rodadas, histórico de
sorteios, pagamentos/valor do presente, login social, notificações SMS. Esta pesquisa
respeita essas exclusões e não as reabre — apenas confirma que a decisão está alinhada com
o que o mercado faz (ver Anti-Features).

## Feature Landscape

### Table Stakes (o usuário espera isso)

Funcionalidades que, se ausentes, fazem o produto parecer incompleto ou quebrado. Todas já
constam no PRD/SDD — a tabela confirma que nenhuma delas é dispensável e nenhuma falta.

| Feature | Por que é esperado | Complexidade | Notas |
|---------|---------------------|---------------|-------|
| Criar grupo e convidar via link | Todo produto do setor (Elfster, DrawNames, Sorteio Amigo Secreto) usa link/código de convite em vez de e-mail manual um a um | LOW | Já no PRD. Link único por grupo; join-by-link é o padrão de 100% dos concorrentes pesquisados |
| Mínimo de participantes para sortear | Elfster e DrawNames bloqueiam o sorteio com poucos participantes (normalmente 3) para evitar pares degenerados | LOW | PRD já define 3 como mínimo — consistente com o mercado |
| Sorteio automático e aleatório | É o núcleo do produto; nenhum concorrente pede para o organizador sortear manualmente | MEDIUM | Algoritmo Fisher-Yates + rotação já decidido no PROJECT.md |
| Ocultar o resultado de terceiros | Em 100% dos produtos analisados, cada participante só vê o próprio par — é a301 razão de existir do produto | MEDIUM | Ver recomendação de UX na Questão A abaixo |
| Lista de desejos (wishlist) | Elfster, DrawNames, Giftster e os apps brasileiros de amigo secreto todos oferecem — é a segunda funcionalidade mais universal do setor, atrás apenas do sorteio | LOW–MEDIUM | PRD já inclui como campo de texto simples (não precisa de links/imagens por item para o MVP) |
| Ver a wishlist de quem você tirou | Decorre diretamente da wishlist; sem isso, a wishlist não tem função | LOW | Depende da feature anterior |
| Impedir organizador de rever ou alterar o sorteio | Diferencial de privacidade: Elfster e DrawNames até permitem "live draw" visível a todos, mas nenhum expõe o resultado ao organizador quando a config é "privado" | MEDIUM–HIGH | Aqui é mais forte que a concorrência: RLS no banco, não só UI — é o core value do projeto |
| Impedir entrada após o sorteio / impedir novo sorteio | Regra universal: depois que o sorteio ocorre, a lista de participantes trava | LOW | Já é regra de negócio no PRD (itens 6 e 7) |

### Differentiators (o que alguns produtos agregam)

Funcionalidades que aparecem em produtos maduros do setor (Elfster, DrawNames, Giftster),
mas não são esperadas universalmente. Avaliadas para ESTE projeto academicamente —
**recomendação de inclusão vai contra a corrente da maioria delas**, porque o PRD já fixou
escopo e a prioridade é poucas fases.

| Feature | Proposta de valor | Complexidade | Recomendação para este projeto |
|---------|--------------------|---------------|-------------------------------|
| Limite de orçamento (budget) | Elfster permite definir um valor-alvo por presente | LOW | **Fora.** Já excluído explicitamente no PRD ("controle de valor do presente" é não-objetivo). Não reabrir |
| Regras de exclusão de pares ("A não pode tirar B") | Elfster/DrawNames usam para casais/pais-filhos | MEDIUM–HIGH | **Fora.** Já excluído explicitamente no PRD/PROJECT.md — aumenta a complexidade do algoritmo sem destravar nenhum indicador novo do checklist |
| Múltiplas rodadas / grupos recorrentes anuais | DrawNames e Giftster suportam "repetir este amigo secreto todo ano" | MEDIUM | **Fora.** PRD exclui histórico de sorteios; multiplicar isso para "rodadas futuras" é o mesmo problema com outro nome |
| Lembretes automáticos (e-mail/push) | Elfster envia lembrete de prazo e de presente pendente | MEDIUM–HIGH | **Fora.** Exigiria job agendado/cron + serviço de e-mail transacional — não demonstra indicador novo, só soma infraestrutura |
| Chat anônimo com o seu par | Elfster tem "anonymous Q&A" com quem você tirou | HIGH | **Fora.** Já excluído explicitamente no PRD. Realtime/mensageria é complexidade desproporcional ao valor para a banca |
| Sugestão de presentes (links de loja, catálogo) | Elfster permite colar links de produtos na wishlist | LOW–MEDIUM | **Fora como feature dedicada**, mas parcialmente resolvida de forma orgânica pela Questão B (API pública) — ver recomendação abaixo |
| Avatar de perfil com foto | Giftster e apps de amigo secreto no Brasil geralmente usam foto do Google/Facebook | LOW–MEDIUM | **Fora.** Depende de login social, que o PRD já exclui. Avatar aleatório (ver Questão B, opção 3) seria mais barato, mas perde para a recomendação #1 |
| Confirmação de presença ("RSVP") antes do sorteio | Alguns apps BR pedem confirmação explícita de cada convidado | LOW | **Avaliar como nice-to-have, não MVP.** Já é parcialmente coberto pelo fato de "entrar no grupo via convite" implicar confirmação implícita. Não adicionar um status extra sem necessidade clara |

**Conclusão sobre differentiators:** nenhum deve ser incorporado ao MVP. O PRD já fez a
curadoria correta — a pesquisa de mercado apenas confirma que essas são exatamente as
funcionalidades que Elfster/DrawNames usam para se diferenciar *entre si*, e que elas
aumentam complexidade sem destravar indicador novo da rubrica. Resistir a readicioná-las é
a decisão certa.

### Anti-Features (parecem boas, mas quebram a restrição deste projeto)

| Feature | Por que parece atraente | Por que é problemática aqui | Alternativa |
|---------|--------------------------|-------------------------------|--------------|
| Chat/mensageria entre participantes | Aumentaria "engajamento" | Exige realtime (WebSocket/Supabase Realtime), moderação, e não demonstra nenhum indicador novo do checklist — só soma uma fase inteira | Lista de desejos em texto já cobre a comunicação assíncrona de preferências |
| Regras de exclusão de pares | Parece "mais robusto" e realista (casais não devem se tirar) | Transforma o sorteio de uma rotação circular trivial (fácil de explicar e provar correção) em um problema de grafos com possibilidade de falha (sem solução viável) — exige retry/backtracking, mais testes, mais estados de erro | Pares circulares (Fisher-Yates + rotação), já decidido no PROJECT.md — sempre tem solução, é O(n), e é trivial de explicar numa banca |
| Múltiplos sorteios/histórico anual | Pareceria "produto completo" | Exigiria modelar grupos recorrentes, arquivamento de sorteios antigos, e RLS para múltiplos resultados por participante — tudo isso sem adicionar nenhum indicador da rubrica | Um grupo = um sorteio único e definitivo, já é a regra de negócio 6 do PRD |
| Login social (Google/Facebook) | "Mais fácil para o usuário", todo app moderno tem | OAuth de terceiros adiciona configuração de provedor, telas de consentimento, e nenhum indicador do checklist exige OAuth — ID20 só pede "fluxo de autenticação e sessão JWT via BaaS", que e-mail/senha do Supabase Auth já cumpre | E-mail/senha via Supabase Auth, já decidido no PRD |
| Avatar com upload de foto/câmera | Deixaria o perfil "mais pessoal" | Exige Supabase Storage, upload de arquivo, redimensionamento, política de RLS extra para bucket — complexidade de infraestrutura nova sem indicador correspondente | Nenhum avatar é necessário; se quiser um toque visual, usar avatar gerado (ver Questão B, mantendo-o fora do MVP) |
| Notificação push/e-mail de lembrete | "Apps de verdade lembram você" | Exige Edge Function agendada (cron) ou serviço de e-mail transacional (Resend, SendGrid) — nova integração, nova chave de API, sem indicador correspondente no checklist | Nenhuma; o fluxo síncrono (entrar, ver status, sortear) já é suficiente para a história ser demonstrável |
| Gamificação (badges, pontuação, countdown animado em destaque) | Tornaria a experiência "mais divertida" | Soma UI e lógica de estado sem relação com nenhum ator/user story do PRD; risco real de virar "feature para impressionar" em vez de "feature que resolve o problema" | Se quiser um toque lúdico, usar o elemento de contagem regressiva de Natal já coberto pela API pública (Questão B), sem transformar isso em sistema de gamificação |

## Feature Dependencies

```
Autenticação (Supabase Auth)
    └──requires──> Perfil de usuário (profile)

Criar grupo
    └──requires──> Autenticação
    └──enhances──> Gerar link de convite

Gerar link de convite
    └──requires──> Criar grupo
    └──requires──> (Participante entra no grupo)

Participante entra via convite
    └──requires──> Link de convite válido
    └──requires──> Autenticação (cadastro ou login)

Sorteio (Edge Function)
    └──requires──> Grupo com >= 3 participantes
    └──requires──> Encerramento de inscrições (regra de negócio 7)

Participante vê seu par (revelação oculta)
    └──requires──> Sorteio já executado
    └──requires──> RLS ativa restringindo linha de "draw" ao próprio participante

Lista de desejos
    └──enhances──> Ver lista de desejos de quem tirei (sem requerer o sorteio)

Ver lista de desejos de quem tirei
    └──requires──> Sorteio já executado
    └──requires──> Lista de desejos (ao menos a tabela/campo existir, mesmo vazia)

Regras de exclusão de pares ──conflicts──> Pares circulares (Fisher-Yates + rotação)
Chat entre participantes ──conflicts──> Privacidade por RLS (abriria canal fora do controle de banco)
```

### Notas de Dependência

- **Sorteio requer grupo com >= 3 participantes e inscrições encerradas:** é a regra de
  negócio 1 e 7 do PRD — sem isso o algoritmo de rotação circular pode degenerar (grupo de
  1–2 pessoas não permite par válido sem auto-sorteio).
- **Revelação do par requer RLS ativa:** a funcionalidade "ver meu par de forma oculta" só
  é genuinamente privada se a política de banco já impedir o admin de ler a linha — a UI
  "escondendo" visualmente sem RLS seria teatro de segurança, não privacidade real (ver
  PROJECT.md, "RLS como mecanismo de privacidade").
- **Regras de exclusão conflita com pares circulares:** a rotação circular (`participante[i]
  tira participante[i+1]`) garante matematicamente zero auto-sorteio e sempre tem solução.
  Adicionar exclusões arbitrárias pode tornar o problema sem solução (grafo sem ciclo
  hamiltoniano válido), exigindo lógica de fallback que não existe hoje no SDD. Por isso
  o PRD exclui exclusões — é uma decisão de design correta, não uma lacuna.
- **Chat conflita com privacidade por RLS:** permitir comunicação direta entre o par
  sorteado e o presenteado criaria um canal onde a identidade poderia escapar
  acidentalmente (ex.: alguém se identifica no chat), minando o valor central de
  anonimato que a RLS garante no banco.

## MVP Definition

### Lançar com isto (v1 — único milestone do semestre)

Minimamente necessário para contar a história completa do PRD e cobrir os 32 indicadores.

- [ ] Cadastro/login com e-mail e senha (Supabase Auth) — ID20
- [ ] Criar grupo + gerar link de convite — core da proposta de valor
- [ ] Entrar em grupo via link de convite — sem isso não há "grupo" de verdade
- [ ] Administrador visualiza e remove participantes — necessário para controle de grupo
- [ ] Sorteio único via Edge Function (Fisher-Yates + rotação), bloqueado com `< 3`
      participantes e após já executado — é o evento central do produto
- [ ] Revelação do par sorteado "de forma oculta" (ver recomendação Questão A) — é o
      momento emocional do produto; sem ele, o app não tem motivo de existir
- [ ] Lista de desejos: criar/editar (texto simples) — completa o ciclo "sorteei, mas o
      que eu dou?"
- [ ] Ver lista de desejos de quem eu tirei — fecha o ciclo de valor
- [ ] Consumo de API pública via GET (ver recomendação Questão B) — ID19, inserido de
      forma orgânica, não como tela isolada
- [ ] Um bloco `@defer` em componente genuinamente pesado (ver recomendação Questão C) — ID8

### Adicionar depois da entrega, se houver tempo (não bloqueia a nota)

- [ ] Confirmação de presença explícita (RSVP) antes do sorteio — hoje implícita ao entrar
      pelo link; só vale a pena se o professor pedir mais granularidade de estado
- [ ] Avatar gerado automaticamente (ex.: imagem de cachorro via Dog CEO) por participante,
      só como polimento visual — nunca crítico

### Não construir neste projeto (fora do escopo do semestre)

- [ ] Regras de exclusão de pares — conflita com o algoritmo escolhido e já excluído no PRD
- [ ] Chat entre participantes — já excluído no PRD, conflita com privacidade por RLS
- [ ] Lembretes automáticos / notificações — nova integração sem indicador correspondente
- [ ] Histórico de sorteios / múltiplas rodadas — já excluído no PRD
- [ ] Controle de orçamento/valor do presente — já excluído no PRD
- [ ] Login social — já excluído no PRD

## Feature Prioritization Matrix

| Feature | Valor para o usuário | Custo de implementação | Prioridade |
|---------|------------------------|---------------------------|------------|
| Autenticação e-mail/senha | HIGH | LOW | P1 |
| Criar grupo + convite | HIGH | LOW | P1 |
| Entrar via convite | HIGH | LOW | P1 |
| Sorteio (Edge Function + RLS) | HIGH | MEDIUM–HIGH | P1 |
| Revelação oculta do par | HIGH | MEDIUM | P1 |
| Lista de desejos (CRUD simples) | MEDIUM–HIGH | LOW | P1 |
| Ver lista de desejos de quem tirei | MEDIUM–HIGH | LOW | P1 |
| Consumo de API pública (orgânico) | MEDIUM (para o usuário) / HIGH (para a rubrica) | LOW | P1 |
| `@defer` em componente pesado | LOW (para o usuário) / HIGH (para a rubrica) | LOW–MEDIUM | P1 |
| RSVP explícito | LOW | LOW | P3 |
| Avatar gerado automaticamente | LOW | LOW | P3 |
| Exclusão de pares | MEDIUM | HIGH | Não entra |
| Chat | MEDIUM | HIGH | Não entra |

**Chave de prioridade:**
- P1: necessário para a entrega (cobre user stories do PRD + indicadores obrigatórios)
- P2: nenhuma feature se qualificou aqui — o projeto é deliberadamente enxuto
- P3: só se houver tempo sobrando após P1 estar 100% testado e demonstrável

---

## Questão A — A interação de revelação do par sorteado

### Padrões reais de UX no mercado

| Padrão | Como funciona | Onde é usado | Esforço mobile | Esforço em Angular+Signals |
|--------|----------------|---------------|------------------|------------------------------|
| **Scratch-to-reveal** (raspadinha) | Usuário "risca" uma camada opaca com o dedo até revelar o conteúdo | Promoções, cupons, raramente em Secret Santa | Alto (requer canvas/gestos de arraste, cálculo de % raspado) | Alto — exige `<canvas>`, listeners de `pointermove`, bitmap de máscara; Signals não ajudam na parte gráfica |
| **Tap-and-hold** (pressionar e manter) | Conteúdo só aparece enquanto o dedo/mouse permanece pressionado; some ao soltar | Apps de mensagens efêmeras (ex. "ver uma vez") | Médio (requer `pointerdown`/`pointerup`, cuidado com scroll acidental) | Médio — dois event handlers alternando um `signal<boolean>` |
| **Click-to-flip card** (cartão que vira) | Toque/clique dispara animação 3D de rotação revelando o verso | Jogos de memória, muitos apps de Secret Santa reais (DrawNames usa variação disso no "live draw") | Baixo–Médio (funciona igual a tap e a click, sem gestos complexos) | Baixo — um `signal<boolean>` + classe CSS condicional com `[class.flipped]`, nenhuma lib extra |
| **Blur até pressionar** | Conteúdo fica borrado (CSS `filter: blur()`) e nitidez aparece só com um botão/toggle | Apps de notícias pagas, prévias de conteúdo bloqueado | Baixo | Baixo — `signal<boolean>` controlando uma classe de blur |
| **Confirm-then-show** (diálogo de confirmação) | Um botão "Revelar meu amigo secreto" abre um modal com confirmação ("Tem certeza que está sozinho(a)?") antes de mostrar o resultado | Pouco comum isoladamente, mas é a camada de segurança que Elfster e DrawNames adicionam **sobre** o cartão de revelação | Baixo | Baixo — reaproveita padrão de diálogo já necessário em outras partes do app (ex. confirmar remoção de participante) |

### Recomendação concreta

**Usar click/tap-to-flip card, com um passo de confirmação antes do flip (combinação de
"click-to-flip" + "confirm-then-show").**

Fluxo recomendado:
1. A tela mostra um cartão fechado com um texto tipo "Toque para revelar seu amigo secreto"
   e um aviso curto: "Certifique-se de estar sozinho(a) antes de continuar".
2. O toque/clique dispara um `signal<boolean>` (`revelado`) que alterna uma classe CSS de
   rotação 3D (`transform: rotateY(180deg)` com `transition`), sem necessidade de biblioteca
   de animação.
3. Opcionalmente, o toque abre antes um `confirm()`/diálogo simples ("Revelar agora?") —
   mas isso pode ser dispensado no MVP se o cartão já exigir uma ação deliberada (toque
   único em vez de revelação automática ao carregar a página).

**Por que esta é a escolha certa para este projeto, e não scratch-to-reveal ou tap-and-hold:**

- **Simplicidade de implementação:** um clique/toque alternando um único Signal booleano e
  uma classe CSS é trivialmente implementável com `signal()` e `[class.revelado]="estaRevelado()"`
  no template — não exige canvas, gestos de arraste ou bibliotecas de terceiros fora do
  stack já fixado no SDD.
- **Funciona identicamente em mobile e desktop:** tap e click disparam o mesmo evento
  `(click)`, sem necessidade de tratar touch e mouse separadamente (ao contrário de
  scratch, que depende de gestos de arraste, ou tap-and-hold, que precisa distinguir toque
  breve de toque prolongado).
- **É deliberado, não acidental:** ao contrário de "blur até pressionar" (que pode revelar
  sem querer num hover de mouse em desktop) ou de carregamento automático, o clique exige
  uma ação consciente do usuário — alinhado à regra de negócio do PRD de que a revelação
  deve ser "de forma oculta" e deliberada.
- **Fácil de explicar numa banca:** "um Signal booleano controla se o cartão está virado;
  o template usa `@if`/binding de classe para mostrar frente ou verso" é uma frase, não um
  parágrafo — essencial dado a restrição de simplicidade do projeto.
- **Demonstra Signals de forma genuína (ID9–ID12):** o estado de revelação é um caso de uso
  canônico de `signal()` + `computed()` (ex.: `computed()` para o texto do botão) sem
  artificialidade.

**Padrões descartados e por quê:** scratch-to-reveal é visualmente mais "divertido", mas
exige lógica de canvas/gestos desproporcional ao valor e não demonstra nenhum indicador
extra do checklist — soma complexidade pura. Tap-and-hold é elegante em apps de mensagens
efêmeras, mas aqui o resultado precisa persistir na tela (o usuário quer reler depois,
inclusive a wishlist do par), então "esconder ao soltar o dedo" prejudica a usabilidade.

---

## Questão B — A API pública consumida organicamente (ID19)

### Opções avaliadas

| Opção | Quão orgânico é | Simplicidade/confiabilidade | Precisa de chave? | CORS no browser |
|-------|-------------------|-------------------------------|----------------------|--------------------|
| **Calendário de feriados nacionais (BrasilAPI)** | Alto — mostra "faltam X dias até o Natal / feriado de fim de ano" relacionado à ocasião típica de Amigo Secreto no Brasil | Alto — resposta simples, JSON plano, sem paginação | Não | Sim, confirmado |
| CEP (BrasilAPI) | Médio — só faria sentido se o produto tratasse endereço de entrega, o que o PRD não cobre | Alto | Não | Sim, confirmado |
| Conversão de moeda (Frankfurter) | Baixo — o PRD exclui explicitamente controle de valor do presente; usar conversão de moeda contradiz esse não-objetivo | Alto | Não | Sim (documentado) |
| Imagens de cachorro/gato como avatar (Dog CEO) | Baixo–Médio — resolveria avatar, mas avatar não é uma user story do PRD; seria uma feature nova só para caber a chamada de API | Alto | Não | Sim, confirmado |
| Sugestão aleatória de presente (ex. APIs de "gift ideas") | Médio — encaixaria na wishlist, mas a maioria das APIs públicas de "gift ideas" exige chave paga ou é instável/descontinuada | Baixo–Médio (instabilidade) | Geralmente sim | Variável, não confiável |
| "Dias até o Natal" via serviço de data genérico | Médio — mesma ideia do calendário de feriados, mas menos rico (só uma data fixa, não a lista de feriados do ano) | Alto, mas é trivial demais (poderia ser calculado no client sem API) | Não | Depende do serviço |

### Verificação ao vivo (2026-10-14, via `curl`)

**BrasilAPI — Feriados nacionais**

```
GET https://brasilapi.com.br/api/feriados/v1/2026
```

Headers confirmados na resposta real: `HTTP/2 200`, `access-control-allow-origin: *`,
`content-type: application/json; charset=utf-8`. Sem autenticação, sem chave, servido via
Cloudflare/Vercel.

Shape de resposta real (array de objetos, trecho):

```json
[
  { "date": "2026-01-01", "name": "Confraternização mundial", "type": "national", "weekday": "quinta-feira" },
  { "date": "2026-11-20", "name": "Dia da consciência negra", "type": "national", "weekday": "sexta-feira" },
  { "date": "2026-12-25", "name": "Natal", "type": "national", "weekday": "sexta-feira" }
]
```

### Recomendação concreta — #1: BrasilAPI `/api/feriados/v1/{ano}`

**Encaixe orgânico no produto:** na tela de grupo (antes ou depois do sorteio), mostrar algo
como "Faltam N dias para o Natal" ou "Próximo feriado: Natal (25/12)" calculado a partir da
lista de feriados nacionais do ano corrente retornada pela API. Isso é uma informação
contextual genuinamente relevante para quem está organizando um Amigo Secreto no Brasil —
não é uma tela "bolt-on" de API isolada, é um dado de apoio à decisão de "quando o grupo
precisa encerrar o sorteio e trocar presentes".

**Avaliação por critério:**
- (a) Naturalidade: ALTA — feriados/Natal são o contexto cultural universal do Amigo
  Secreto no Brasil.
- (b) Simplicidade/confiabilidade: ALTA — endpoint único, sem paginação, sem parâmetros
  complexos, resposta estável (confirmada ao vivo agora).
- (c) Chave de API: NENHUMA necessária — confirmado sem header de autenticação.
- (d) CORS: confirmado via curl nesta data — `access-control-allow-origin: *` — chamável
  direto do browser Angular via `HttpClient`, sem proxy/backend intermediário.

Esta é uma escolha superior à conversão de moeda (contradiz não-objetivo do PRD) e à
imagem de cachorro (exigiria inventar uma feature de avatar não solicitada). O calendário
de feriados se encaixa na história do produto sem forçar nada.

**Implementação sugerida (nível de complexidade):** LOW. Um `HttpClient.get<Feriado[]>()`
em um service, convertido para Signal via `toSignal()` (demonstra ID19 e reforça ID24 —
ponte RxJS↔Signals — de forma natural, sem artificialidade), e um `computed()` que calcula
dias restantes até `25/12` a partir da lista.

---

## Questão C — Onde o `@defer` (ID8) se encaixa naturalmente

### Candidatos avaliados

| Componente candidato | É genuinamente "pesado"? | Veredito |
|------------------------|------------------------------|----------|
| Lista de participantes do grupo | Não — é uma lista pequena (3–20 itens), renderização trivial com `@for` | Não usar `@defer` aqui — seria artificial |
| Formulário de login/cadastro | Não — é crítico para a primeira interação, não deve ser adiado (contraindicado pela própria documentação do Angular) | Não usar |
| Cartão de revelação do par sorteado | Não é pesado em bytes, mas é a tela mais importante — adiar carregaria risco de parecer "quebrado" | Não usar |
| **Bloco de lista de desejos de quem eu tirei + chamada à API pública de feriados (painel de contexto)** | **Sim** — é o componente que, combinado, carrega mais lógica (texto da wishlist + chamada HTTP externa + cálculo de data), e só é relevante **depois** que o sorteio ocorreu — antes disso, nem deveria renderizar | **Usar `@defer` aqui** |
| Painel de "dias até o Natal" (API pública isolada) | Sim, é pequeno isoladamente, mas é um bom gatilho de `@defer on viewport` por ser abaixo da dobra e não crítico ao primeiro render | Candidato secundário, pode ser o mesmo bloco acima |

### Recomendação concreta

**Usar `@defer` no componente que exibe a lista de desejos do par sorteado junto com o
painel de contexto da API pública (feriados/dias até o Natal), carregado com gatilho
`on viewport` (ou `on interaction` no botão "ver lista de desejos").**

**Por que é defensável, não artificial:**
- Esse componente só existe/é relevante **após** o sorteio ter ocorrido — antes disso, a
  rota nem precisa montá-lo. Isso é exatamente o caso de uso que a documentação oficial do
  Angular recomenda: "componentes pesados que não são usados até mais tarde".
- Ele combina: (1) uma chamada HTTP externa (API de feriados), (2) leitura de dados do
  Supabase (wishlist do par sorteado), e (3) formatação via Pipe (ID7, ex. `DatePipe` para
  a data do feriado) — é o ponto do app onde mais código/dependências se concentram fora do
  caminho crítico (login, grupo, sorteio).
- Fica naturalmente abaixo da dobra na tela de resultado — o usuário primeiro revela o
  par (Questão A), depois rola a tela para ver a wishlist — alinhado ao gatilho `on
  viewport`.
- **Não** colocar `@defer` em login, formulário de grupo ou cartão de revelação — adiar o
  carregamento desses seria ir contra a boa prática documentada (conteúdo crítico/above the
  fold não deve ser deferido) e pareceria forçado numa banca.

**Complexidade:** LOW — um bloco `@defer (on viewport) { <app-wishlist-par /> } @placeholder { ... } @loading { ... }` em volta do componente que já existiria de qualquer forma.

---

## Resumo: conjunto mínimo de features que ainda conta uma história completa

Para uma apresentação de 10–15 minutos, a sequência demonstrável é:

1. Visitante cria conta → faz login (Supabase Auth, ID20)
2. Administrador cria grupo → gera link de convite
3. Participantes entram pelo link (mínimo 3)
4. Administrador encerra inscrições → aciona sorteio (Edge Function, RLS provável de
   verificar em tempo real que nem o admin consegue ler os pares)
5. Cada participante revela seu par com o cartão flip (Questão A) — o momento emocional
6. Participante edita sua própria lista de desejos
7. Participante vê a lista de desejos de quem tirou, dentro de um bloco `@defer` que também
   mostra "faltam N dias para o Natal" (API pública BrasilAPI, Questão B + Questão C)

Essa sequência cobre, sem nenhuma tela ou feature "extra" para inflar a rubrica: ID3, ID5–ID14,
ID15–ID18 (rotas protegidas por guard, parâmetros de rota para grupo/convite), ID19–ID24,
e ainda é curta e linear o suficiente para caber nas "poucas fases" exigidas pelo usuário.

## Sources

- [Elfster — Secret Santa Rules 2026](https://www.elfster.com/content/secret-santa-rules) — MEDIUM confidence (site do produto, não documentação técnica)
- [Elfster vs DrawNames comparison](https://yourappland.com/elfster-vs-drawnames-comparison/) — MEDIUM confidence
- [BrasilAPI — Feriados endpoint, verificado ao vivo via curl em 2026-10-14](https://brasilapi.com.br/api/feriados/v1/2026) — HIGH confidence (resposta real capturada nesta pesquisa)
- [BrasilAPI — CEP endpoint, verificado ao vivo via curl em 2026-10-14](https://brasilapi.com.br/api/cep/v1/01310930) — HIGH confidence
- [Dog CEO API, verificado ao vivo via curl em 2026-10-14](https://dog.ceo/api/breeds/image/random) — HIGH confidence
- [Frankfurter currency API — keyless, CORS, 223 currencies](https://frankfurter.dev/) — MEDIUM confidence (não testado via curl nesta pesquisa, apenas WebSearch; descartado da recomendação final por conflitar com não-objetivo do PRD)
- [Angular official docs — Deferrable Views](https://angular.dev/tutorials/learn-angular/10-deferrable-views) — HIGH confidence (documentação oficial)
- [Angular Architects — Deferrable Views performance guide](https://www.angulararchitects.io/en/blog/deferrable-views/) — MEDIUM confidence
- UX de scratch-card / flip-card / tap-and-hold — fontes gerais de design (UX Planet, Medium, UXmatters) — LOW–MEDIUM confidence, sem fonte específica de apps de Secret Santa; a recomendação final prioriza a restrição de simplicidade do projeto sobre a "melhor" prática de UX isolada

---
*Feature research for: Amigo Secreto / Secret Santa web app (UTF-Secret)*
*Researched: 2026-10-14*
