# Pitfalls Research

**Domínio:** PWA Angular 17+/Supabase (Amigo Secreto) entregue como projeto acadêmico avaliado por rubrica de 32 indicadores
**Pesquisado em:** 2026-10-14
**Confiança geral:** ALTA para as armadilhas de rubrica (regras ESLint verificadas no repositório oficial `angular-eslint/angular-eslint` em 2026-10-14) e para RLS/Supabase (documentação oficial + múltiplas fontes independentes). MÉDIA para alguns detalhes de deploy na Vercel (fontes da comunidade, não documentação oficial da Vercel).

> **Nota de segurança:** durante a leitura dos arquivos deste projeto, dois blocos de texto injetados nos resultados de ferramentas tentaram me redirecionar para um fluxo de "Claude Docs" e para um modo de "bypass permissions" que mandaria ignorar as ferramentas Read/Write. Ambos foram ignorados como tentativas de prompt injection — não eram instruções legítimas do usuário ou do orquenstrador. Este relatório foi produzido normalmente com as ferramentas Read/WebSearch/WebFetch/Write.

---

## Critical Pitfalls

### Pitfall 1: Escrever Angular "que funciona" mas na sintaxe errada para a rubrica (`*ngIf`/`*ngFor`, decorators, construtor)

**O que dá errado:**
O código roda perfeitamente, mas usa `*ngIf`/`*ngFor` em vez de `@if`/`@for`, `@Input()`/`@Output()` em vez de `input()`/`output()`, ou injeção via construtor em vez de `inject()`. Isso é o modo de falha mais provável deste projeto porque treinamento de LLM e hábito de desenvolvedor tendem para a sintaxe "clássica" do Angular, que ainda compila e funciona — mas zera indicadores específicos (ID5, ID6, ID13, ID14) mesmo com o sistema 100% funcional.

**Por que acontece:**
Angular mantém essas APIs antigas funcionando por compatibilidade (nenhuma é removida, só "preferida contra"). Não há erro de compilação ao usar `*ngFor` ou `@Input()`. Um agente de IA ou dev apressado replica o padrão mais comum nos dados de treino, que ainda é majoritariamente pré-Signals.

**Como evitar (mecanicamente, não por vigilância):**
Instalar `@angular-eslint` e ativar como **erro** (não apenas sugestão) as seguintes regras verificadas no repositório oficial (`angular-eslint/angular-eslint`, pacotes `eslint-plugin` e `eslint-plugin-template`, branch `main`, consultado em 2026-10-14):

| Regra | Pacote | O que pega | Autofix |
|:------|:-------|:-----------|:--------|
| `@angular-eslint/template/prefer-control-flow` | `eslint-plugin-template` | `*ngIf`, `[ngIf]`, `*ngFor`, `[ngForOf]`, `*ngSwitch`/`[ngSwitch]` — exige `@if`/`@for`/`@switch` | Não documentado como fixable automático |
| `@angular-eslint/prefer-signals` | `eslint-plugin` | `@Input()`, `@Output()`, `@ViewChild()`, `@ViewChildren()`, `@ContentChild()`, `@ContentChildren()` — exige `input()`, `output()`, `viewChild()`, etc. | Sim (`--fix`) |
| `@angular-eslint/prefer-output-emitter-ref` | `eslint-plugin` | `@Output()` especificamente — exige `output()` | Não confirmado como fixable |
| `@angular-eslint/prefer-inject` | `eslint-plugin` | Qualquer parâmetro de construtor injetado (com ou sem `@Inject()`/`@Optional()`/`@Self()`/`@SkipSelf()`/`@Host()`) em classe decorada (`@Component`, `@Injectable`, etc.) — exige `inject()` | Não confirmado |
| `@angular-eslint/prefer-standalone` | `eslint-plugin` | Qualquer `standalone: false` explícito — ajuda a impedir regressão para `NgModule` | Sim (`--fix`), mas há issue aberta pedindo para desabilitar o autofix nesse caso específico |
| `@angular-eslint/prefer-signal-model` | `eslint-plugin` | Padrão `input()` + `output()` com nome `xChange` que deveria ser `model()` — ajuda a cumprir ID11 nos casos em que o par input/output existe | Sim (`--fix`) |
| `@angular-eslint/template/banana-in-box` | `eslint-plugin-template` | Sintaxe incorreta de two-way binding (`([ngModel])` em vez de `[(ngModel)]`) — não impede o uso de `ngModel`, só corrige a sintaxe se usado | — |
| `@angular-eslint/template/use-track-by-function` | `eslint-plugin-template` | É a regra para o `trackBy` do **antigo** `*ngFor`; não se aplica ao `@for` novo (ver limitação abaixo) | — |

> **Correção (2026-10-14, verificada contra os plugins instalados).** Uma versão anterior deste
> documento afirmava que `@Output()` era coberto apenas indiretamente, via `prefer-signals`.
> Isso está incorreto: a regra dedicada `@angular-eslint/prefer-output-emitter-ref` existe,
> não está deprecada, e sinaliza o decorator `@Output()` diretamente. Ela está incluída na
> configuração do projeto como `"error"`.

**Limitações importantes (honestidade sobre o que NÃO é coberto por lint):**
- **`track` obrigatório em `@for`:** não precisa de ESLint — é **erro de compilação do próprio Angular** (`NG5002: @for loop must have a "track" expression`). Ou seja, é impossível fazer build de produção sem `track`. Isso é uma rede de segurança gratuita; ainda assim, vale confirmar rodando `ng build` localmente antes de cada PR.
- **`[(ngModel)]` ou getter/setter manual em vez de `model()`:** não existe regra de `@angular-eslint` que proíba `ngModel` diretamente (só corrige a sintaxe se usado incorretamente). A prevenção aqui é 100% de revisão de código/checklist de PR — não há regra mecânica equivalente a "bana ngModel". Recomenda-se banir a importação de `FormsModule` do projeto (todos os formulários usam Reactive Forms por ID23 de qualquer forma), o que torna `[(ngModel)]` literalmente incompilável por falta do diretivo.
- **`BehaviorSubject` em vez de Signal (ID9):** `@angular-eslint/prefer-signals` **não detecta uso de `BehaviorSubject`/RxJS `Subject`** — isso é confirmado na documentação oficial da regra. Não existe regra de lint pronta para isso. Mitigação: regra de arquitetura (nenhum `Service` deve importar `BehaviorSubject`/`Subject` do `rxjs` para guardar estado — só para eventos/streams reais que depois passam por `toSignal()`), verificável com um grep simples em CI: `grep -rn "BehaviorSubject" src/app && exit 1 || exit 0`.

**Configuração recomendada (`eslint.config.js`, flat config, Angular 17+):**
```js
// trecho ilustrativo — adaptar ao gerador oficial `ng add @angular-eslint/schematics`
rules: {
  '@angular-eslint/prefer-standalone': 'error',
  '@angular-eslint/prefer-signals': 'error',
  '@angular-eslint/prefer-output-emitter-ref': 'error',
  '@angular-eslint/prefer-inject': 'error',
  '@angular-eslint/prefer-signal-model': 'error',
  '@angular-eslint/template/prefer-control-flow': 'error',
  '@angular-eslint/template/banana-in-box': 'error',
}
```

**Sinais de alerta (detecção precoce):**
- `grep -rn "\*ngIf\|\*ngFor\|\*ngSwitch" src/app` retorna qualquer resultado.
- `grep -rn "@Input(\|@Output(" src/app` retorna qualquer resultado fora de componentes de terceiros.
- `grep -rn "constructor(" src/app/**/*.ts` com parâmetros tipados (sinal de DI via construtor).
- `grep -rn "BehaviorSubject\|new Subject" src/app`.
- `npx eslint src --max-warnings=0` falhando no CI.

**Fase a abordar:**
Configurar o ESLint com essas regras como **erro** (não warning) no momento do scaffold inicial do projeto (antes do primeiro componente de feature), e rodar `npx eslint` como gate obrigatório no CI/PR a partir da primeira Pull Request. Revisitar a lista de IDs cobertos por lint vs. cobertos só por revisão manual ao final de cada fase de feature.

---

### Pitfall 2: `NgModule` reaparecendo via schematics/geradores padrão do Angular CLI

**O que dá errado:**
Mesmo em projetos standalone, alguns comandos `ng generate` mais antigos ou mal configurados (ou um agente de IA seguindo tutoriais antigos no treino) podem gerar um `NgModule` (por exemplo, ao gerar um módulo de rota legado, ou ao copiar snippets de bibliotecas de terceiros que ainda documentam uso via `NgModule.forRoot()`).

**Por que acontece:**
O Angular CLI moderno (17+) já cria projetos novos com `standalone: true` por padrão desde a v17, e o `ng generate component` não gera módulo a menos que explicitamente pedido com `--standalone=false`. O risco real não é o CLI gerar módulo "por acidente", é uma biblioteca de terceiro (ex.: algum componente de UI library) ou um trecho de documentação antiga exigir `imports: [SomeModule]` em vez de standalone imports — ou um dev copiar/colar de um tutorial de 2021.

**Como evitar:**
- A regra `@angular-eslint/prefer-standalone` (listada no Pitfall 1) é a defesa mecânica: qualquer `@Component`, `@Directive` ou `@Pipe` com `standalone: false` (explícito ou implícito em versões antigas do Angular) dispara erro.
- Confirmar no `angular.json`/`tsconfig` que o projeto foi criado com `ng new --standalone` (padrão desde Angular 17) — checar se existe algum arquivo `app.module.ts` no repositório: `find src -iname "*.module.ts"` deve retornar vazio.
- Ao escolher bibliotecas de UI (Spartan UI/HLM, Lucide Angular), confirmar na documentação oficial de cada uma que a versão usada expõe API standalone (ambas já são standalone-first em 2026, mas vale confirmar antes de instalar, conforme a própria restrição do SDD de "nenhuma dependência sem refletir na tabela").

**Sinais de alerta:**
- `find src -iname "*.module.ts"` retorna qualquer arquivo.
- Import de `NgModule` em qualquer arquivo: `grep -rn "NgModule" src/app`.

**Fase a abordar:**
Scaffold inicial (garantir `ng new` com standalone) e checagem de dependências a cada nova biblioteca instalada.

---

### Pitfall 3: Uso de `effect()` para derivar estado que deveria ser `computed()`, e o anti-padrão de escrever em signal dentro de `effect()`

**O que dá errado:**
`effect()` é usado para *reagir* a mudanças com efeitos colaterais (log, sincronizar com `localStorage`, chamar uma API). Quando usado para **derivar** um novo valor de outro signal (ex.: `effect(() => this.total.set(this.a() + this.b()))`), o código funciona, mas é o padrão errado — deveria ser `computed()`. Pior: escrever em um signal dentro de um `effect()` que também *lê* esse mesmo signal (ou um signal que o afeta de volta) pode gerar loop de re-execução do efeito, e a partir do Angular 19 o padrão de "escrever dentro de effect" sem `allowSignalWrites`/sem necessidade real passa a ser tratado como anti-padrão ativamente desencorajado pelo time do Angular.

**Por que acontece:**
`effect()` parece "mais poderoso" e genérico, então é tentador usá-lo para tudo que envolve reatividade — inclusive casos que são puramente derivação de dados, que é exatamente o caso de uso de `computed()`.

**Como evitar:**
- Regra de bolso para o time: *"Se a função só lê signals e retorna um valor novo, sem causar nenhum efeito observável fora do próprio valor, é `computed()`. Se a função precisa falar com o mundo externo (DOM, storage, log, chamada HTTP disparada por mudança de estado), é `effect()`."*
- Existe uma regra `@angular-eslint/reactive-context-must-read-signal` e `@angular-eslint/computed-must-return` no repositório oficial, que ajudam a garantir uso correto de `computed()`, mas **não existe regra de ESLint que detecte "este effect deveria ser computed"** — é uma decisão semântica que só revisão de código pega. Recomendação prática: em toda PR, buscar por `effect(` e perguntar na revisão "este effect escreve em algum signal, ou só loga/sincroniza externamente?". Se escreve, questionar se não deveria ser `computed()`.
- Ativar `@angular-eslint/computed-must-return` (garante que todo `computed()` tem um `return`, evitando usos incorretos que de qualquer forma indicam confusão entre os dois conceitos).

**Sinais de alerta:**
- `grep -rn "effect(" src/app` seguido de inspeção manual de cada ocorrência — no projeto este número deve ser pequeno (poucos efeitos reais: ex. persistir sessão do Supabase, sincronizar tema). Se houver mais de ~5 efeitos num projeto deste tamanho, é sinal de uso incorreto generalizado.
- Qualquer `effect()` cujo corpo termina em `.set(...)` ou `.update(...)` sobre um signal que também é lido por outro `computed()`.

**Fase a abordar:**
Fase de implementação do `DrawService`/`AuthService` (onde o estado reativo central é definido) — é ali que a decisão `computed()` vs `effect()` precisa ser acertada logo no design do serviço, não corrigida depois.

---

### Pitfall 4: RLS com recursão infinita na política da tabela `draw` ou `group` (erro 42P17)

**O que dá errado:**
Uma policy de RLS que faz `SELECT` na própria tabela que ela protege (por exemplo, uma policy em `group` que verifica "o usuário é admin de algum grupo" consultando `group` de novo, ou uma policy em `participant` que verifica pertencimento consultando `participant`) entra em loop: avaliar a policy dispara a subquery, que dispara a mesma policy de novo, até o Postgres abortar com `"infinite recursion detected in policy for relation ..."` (SQLSTATE 42P17). Isso é descrito como o erro mais comum e mais citado em RLS do Supabase.

**Por que acontece:**
O caso de uso natural deste projeto é exatamente o gatilho clássico: "admin só vê grupos que administra" e "participante só vê participantes do próprio grupo" tentam, de forma ingênua, verificar pertencimento consultando a própria tabela (`group` ou `participant`) dentro da política dessa mesma tabela.

**Como evitar:**
- Regra geral: uma policy pode consultar **outra** tabela livremente (isso não recursiona). Recursão só ocorre quando a policy consulta a **mesma** tabela que está protegendo.
- Para os casos deste projeto (ex.: "participante só lê linhas de `participant` do grupo ao qual pertence"), mover a checagem de pertencimento para uma função `SECURITY DEFINER` (que roda como owner da tabela e, portanto, contorna o RLS *apenas* para essa leitura interna específica), fixando `set search_path = ''` na função por segurança, e chamando essa função de dentro da policy em vez de fazer `SELECT` direto na mesma tabela.
- Especificamente para a tabela `draw` (a política mais crítica do projeto): a política deve comparar `giver_id` com o `participant.id` do usuário autenticado — isso é uma consulta à tabela `participant`, não a `draw`, então não recursiona por si só. O risco de recursão aparece mais em `group` (admin check) e `participant` (pertencimento ao grupo), que são os dois casos clássicos.
- Testar cada policy isoladamente no SQL editor do Supabase (ou via `psql`) antes de integrar ao frontend, simulando `SET request.jwt.claims` com um usuário de teste.

**Sinais de alerta:**
- Qualquer chamada à API do Supabase retornando erro 500 genérico ("Internal Server Error") sem mensagem clara no frontend — o erro 42P17 do Postgres às vezes aparece encapsulado assim.
- Logs do Supabase (Dashboard → Logs → Postgres) mostrando `infinite recursion detected in policy for relation "group"` ou `"participant"`.

**Fase a abordar:**
Fase de modelagem do banco e RLS (antes de qualquer tela que dependa de leitura de grupo/participante) — escrever e testar as policies com um usuário fake via SQL antes de conectar o frontend.

---

### Pitfall 5: `service_role` key vazando para o frontend — quebra total do core value do projeto

**O que dá errado:**
A chave `service_role` do Supabase **ignora RLS completamente**. Se ela acabar em qualquer variável de ambiente prefixada para ser injetada no bundle do frontend (no Angular, isso seria colocar a chave em `environment.ts`/`environment.prod.ts` ou em uma variável `NG_APP_*`/pública), qualquer usuário consegue abrir o DevTools, extrair a chave do bundle JS e ler a tabela `draw` inteira — destruindo o diferencial central do projeto ("nem o administrador vê os pares") de forma pior do que um bug de UI, porque se torna uma falha de segurança de banco auditável.

**Por que acontece:**
É comum confundir "a Edge Function precisa da service_role" com "a app precisa da service_role". Também é comum, em tutoriais e exemplos rápidos, colar a `service_role` key direto no `.env` do projeto Angular por conveniência durante testes, e esquecer de trocar antes do deploy.

**Como evitar (garantia mecânica, não só vigilância):**
- **Regra de ouro:** a `service_role` key só pode existir como variável de ambiente do runtime da Supabase Edge Function (configurada via `supabase secrets set` ou painel do Supabase), **nunca** em `environment.ts`, `environment.prod.ts`, nem em nenhuma variável de ambiente da Vercel que seja exposta ao client (na Vercel/Angular, isso significa: nunca referenciada em código que roda no browser).
- O cliente Angular usa **apenas** a chave pública (`anon`/`sb_publishable_...`) — e com RLS ativa, essa chave é segura de ficar exposta no bundle por design.
- Nota de atualização (2026): a Supabase está depreciando as chaves legadas `anon`/`service_role` ao longo de 2026, migrando para `sb_publishable_...` (equivalente a `anon`, segura no client) e `sb_secret_...` (equivalente a `service_role`, só em backend/Edge Function). Como o projeto inicia em outubro de 2026, vale já nomear as variáveis de ambiente como `SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` para já alinhar com o novo esquema, verificando no dashboard do Supabase do projeto qual par de chaves está disponível no momento do cadastro.
- Checagem mecânica em CI: um step de build que falha se encontrar qualquer substring correspondente ao padrão de uma secret key no diretório `dist/` após o build de produção: `grep -r "sb_secret_\|service_role" dist/ && exit 1 || exit 0`. Isso pega o caso em que a chave foi colada por engano em qualquer arquivo que termina compilado no bundle do client.
- `.env` com a secret key nunca deve ser commitado — confirmar `.env*` (exceto `.env.example`) no `.gitignore` desde o primeiro commit.

**Sinais de alerta:**
- Qualquer resultado de `grep -rn "service_role\|SERVICE_ROLE\|sb_secret_" src/ environments/`.
- A Edge Function do sorteio sendo chamada diretamente do client passando a secret key como header (em vez de a Function ler a secret key do próprio ambiente do Supabase e o client só enviar o JWT do usuário).

**Fase a abordar:**
Fase de configuração de ambiente/Supabase (antes de escrever a Edge Function do sorteio) — definir o template de variáveis de ambiente (`.env.example`) e o gate de CI logo na primeira fase de infraestrutura, não depois.

---

### Pitfall 6: Confiar na UI para "esconder" o sorteio enquanto a linha continua legível no banco

**O que dá errado:**
O frontend simplesmente não exibe o par de outros participantes na tela — mas se a policy de RLS da tabela `draw` permitir `SELECT` de qualquer linha do grupo (não só a própria), qualquer usuário autenticado consegue ler todos os pares fazendo uma chamada direta à REST API do Supabase (via `curl`/DevTools/Postman) com seu próprio JWT, ignorando a UI inteiramente. Isso mina exatamente a promessa central do PRD ("o administrador não tem acesso aos pares sorteados").

**Por que acontece:**
É o atalho mental mais comum em CRUDs: "a tela já não mostra isso, então está seguro". Funciona para esconder informação de um usuário descuidado, mas não resiste a um usuário curioso ou a uma avaliação técnica (que é exatamente o público duplo deste projeto — o professor pode e deve testar isso).

**Como evitar:**
- A política de RLS da tabela `draw` deve restringir `SELECT` estritamente a `giver_id = (SELECT participant.id FROM participant WHERE participant.user_id = auth.uid() AND participant.group_id = draw.group_id)` — ou seja, **a linha só é visível para quem é o "doador" daquele par específico**, nunca para o grupo todo e nunca para o admin.
- Teste de verificação concreto (deve ser um teste automatizado, não só manual): autenticar como usuário B e tentar `SELECT * FROM draw WHERE giver_id = <id do usuário A>` via Supabase client — a query deve retornar vazio (RLS filtra), não erro 403. Esse teste pertence ao conjunto de `.spec.ts`/testes de integração do ID32, focado explicitamente na regra de negócio #4 do PRD.
- Nunca implementar a lógica "esconder do admin" como um `WHERE` no código do frontend — isso é decoração sobre uma falha de segurança, não a segurança em si.

**Sinais de alerta:**
- Qualquer query ao Supabase no código do admin (`manage-group.page.ts`, `GroupService`) que faça `SELECT` na tabela `draw` sem filtro por usuário.
- Teste manual: logar como admin e tentar `supabase.from('draw').select('*')` no console do browser — se retornar linhas de outros participantes, a policy está errada.

**Fase a abordar:**
Fase de modelagem RLS, com verificação repetida na fase de implementação da tela de resultado do sorteio (`draw-result.page.ts`) — o teste de "admin não vê" deve ser critério de aceite explícito dessa fase, não um detalhe.

---

### Pitfall 7: Condição de corrida no "iniciar sorteio" — dois cliques simultâneos gerando dois sorteios

**O que dá errado:**
O botão "iniciar sorteio" do admin, se não for protegido, pode ser clicado duas vezes (duplo clique acidental, ou duas abas abertas) antes que o estado do grupo mude para `drawing`/`closed`, dois dois cliques disparando duas invocações da Edge Function e dois `INSERT` na tabela `draw` — violando a regra de negócio #6 do PRD ("o sorteio só pode ser iniciado uma única vez por grupo") e corrompendo os pares.

**Por que acontece:**
É um clássico problema de "check-then-act" não atômico: a Edge Function faz `SELECT group.status`, vê `open`, e só depois faz o `INSERT`/`UPDATE` — mas entre o `SELECT` e o `UPDATE`, outra invocação pode ter feito a mesma checagem e passado pelo mesmo caminho.

**Como evitar:**
- Nunca confiar em "verificar status, depois agir" como duas operações separadas. Em vez disso, o `UPDATE group SET status = 'drawing' WHERE id = $1 AND status = 'open'` deve ser **atômico e condicional**: se nenhuma linha for afetada (porque o status já não é `open`), a Edge Function aborta e retorna erro "sorteio já iniciado", sem nunca chegar a gerar os pares.
- Adicionalmente, proteger a tabela `draw` com uma constraint que torna duplicação logicamente impossível mesmo se o código falhar: `UNIQUE (group_id, giver_id)` — garante que, mesmo que a Edge Function rode duas vezes por algum motivo, a segunda tentativa de `INSERT` para o mesmo par falha com `duplicate key value violates unique constraint`, que a Function deve tratar como "sorteio já existe" em vez de propagar erro genérico.
- Preferir `INSERT ... ON CONFLICT (group_id, giver_id) DO NOTHING` na escrita dos pares, para que a atomicidade não dependa de lógica aplicacional perfeita.
- No frontend, desabilitar o botão imediatamente no clique (estado local `isDrawing` signal) como camada de UX — mas isso é só cosmético; a garantia real é a constraint + `UPDATE ... WHERE status = 'open'` atômico no backend.

**Sinais de alerta:**
- Teste manual: dois cliques rápidos (ou duas abas) no botão "iniciar sorteio" resultando em mais de N linhas na tabela `draw` para o mesmo grupo (deveria ser exatamente N = número de participantes).
- Ausência de `UNIQUE` constraint em `draw(group_id, giver_id)` no schema SQL.

**Fase a abordar:**
Fase de implementação da Edge Function de sorteio — a constraint `UNIQUE` deve ser parte da migration inicial da tabela `draw`, e o teste de duplo clique deve ser critério de aceite dessa fase.

---

### Pitfall 8: Sessão do Supabase não restaurada no refresh da página / `onAuthStateChange` mal conectado a Signals

**O que dá errado:**
Ao recarregar a página (F5), o usuário aparece como deslogado por um instante (ou permanentemente), porque o `AuthService` não aguarda a resolução assíncrona da sessão persistida (`supabase.auth.getSession()`) antes de decidir se o guard de rota deixa passar — o guard roda síncrono contra um signal de "usuário" ainda `null` no momento do boot da aplicação, redirecionando incorretamente para `/login` mesmo com uma sessão válida salva no `localStorage`.

**Por que acontece:**
`supabase.auth.getSession()` e o callback inicial de `onAuthStateChange` são assíncronos; se o `authGuard` funcional lê um signal de estado de autenticação que só é populado depois que essa Promise resolve, existe uma janela de corrida entre "app iniciou" e "sessão restaurada".

**Como evitar:**
- O `AuthService` deve expor um signal de estado explícito com três valores (não um booleano): `'loading' | 'authenticated' | 'unauthenticated'`, inicializado como `'loading'`, e os guards funcionais devem tratar `'loading'` de forma explícita (ex.: aguardar via um `Observable`/`Promise` convertido com `toSignal` com valor inicial, ou usar um `APP_INITIALIZER`/função de inicialização do `provideAppInitializer` que resolve a sessão antes do router navegar).
- Conectar `onAuthStateChange` uma única vez, no `AuthService`, e atualizar o signal correspondente; nunca duplicar a subscription em múltiplos componentes.
- Teste de aceite manual: logar, dar F5 em `/dashboard`, confirmar que não há flash de redirecionamento para `/login` antes de mostrar o dashboard.

**Sinais de alerta:**
- Flash visual de tela de login seguido por redirecionamento de volta ao dashboard após F5.
- Guard funcional que lê `this.authService.user()` sem checar um estado de carregamento primeiro.

**Fase a abordar:**
Fase de implementação do `AuthService`/guards — antes de qualquer rota protegida ser construída, o padrão de inicialização de sessão deve estar resolvido e testado com F5 manual.

---

### Pitfall 9: Confirmação de e-mail do Supabase Auth bloqueando login durante desenvolvimento/demonstração

**O que dá errado:**
Por padrão, novos projetos Supabase exigem confirmação de e-mail antes do primeiro login. Durante desenvolvimento e principalmente durante a apresentação ao professor, isso trava o fluxo: contas de teste criadas na hora não conseguem logar porque o e-mail de confirmação (que pode ir para spam, ou nem ser entregue com o provedor de e-mail padrão de desenvolvimento do Supabase, que tem limite de envio baixo) nunca chega a tempo.

**Por que acontece:**
É o comportamento padrão de qualquer projeto novo no Supabase Auth, pensado para produção real, não para ciclos rápidos de teste/demonstração acadêmica.

**Como evitar:**
- No ambiente de desenvolvimento/demonstração, desabilitar "Confirm email" em Authentication → Providers → Email no dashboard do Supabase (ou criar contas de teste já confirmadas manualmente via SQL/dashboard).
- Documentar essa configuração no README (seção de setup), para não ser esquecida ao recriar o projeto Supabase do zero próximo da apresentação.
- Se mantiver confirmação de e-mail ativa por fidelidade ao fluxo real de produção, preparar contas de demonstração pré-confirmadas com antecedência, nunca criar conta nova "na hora" durante a banca.

**Sinais de alerta:**
- Erro "Email not confirmed" ao tentar logar com conta recém-criada durante testes.
- Primeira tentativa de demonstração ao vivo sem ensaio prévio do fluxo de cadastro completo.

**Fase a abordar:**
Fase de setup do Supabase (primeira fase de infraestrutura) — decidir e documentar a política de confirmação de e-mail antes de qualquer teste de fluxo de autenticação.

---

### Pitfall 10: PWA "funciona local" mas falha no critério de instalabilidade (ID3/RA1) em produção

**O que dá errado:**
O app funciona bem em `ng serve` (sem service worker, porque o Angular Service Worker é desabilitado por padrão fora de build de produção), dando falsa confiança — mas no deploy real, o manifest tem ícones no tamanho/formato errado, falta o ícone de 512x512 "maskable", ou o service worker não é registrado corretamente, e o navegador nunca oferece o prompt de instalação. Como o ID3 exige uma PWA instalável de fato (não só um manifest.json presente), isso é um indicador inteiro perdido mesmo com o app "funcionando".

**Por que acontece:**
`ng add @angular/pwa` gera a configuração básica, mas os critérios de instalabilidade do Chrome/Edge exigem: manifest com `name`, `short_name`, `start_url`, `display: standalone`, pelo menos um ícone 192x192 e um 512x512 (idealmente com `purpose: maskable`), servido via HTTPS, e um service worker registrado que responda a `fetch`. Qualquer um desses faltando silenciosamente desabilita o prompt — sem erro visível na tela, só no Lighthouse/DevTools → Application → Manifest.

**Como evitar:**
- Rodar `ng add @angular/pwa` logo na fase de scaffold (gera `manifest.webmanifest`, `ngsw-config.json` e registra o service worker no `app.config.ts`/`main.ts` automaticamente).
- Verificar manualmente no Chrome DevTools → Application → Manifest que não há nenhum erro/warning listado, e que o ícone 512x512 existe no caminho correto referenciado pelo manifest.
- Rodar Lighthouse (aba do DevTools ou `npx lighthouse <url> --only-categories=pwa`) contra o build de produção já deployado (não `ng serve`) e confirmar nota de PWA alta, sem itens críticos de "installability" falhando.
- Testar a instalação de fato (ícone de instalar na barra de endereço do Chrome desktop, ou "Adicionar à tela inicial" no Chrome Android) contra a URL de produção na Vercel, não localmente.

**Sinais de alerta:**
- DevTools → Application → Manifest mostrando qualquer erro em vermelho.
- Ausência do ícone de instalação na barra de endereço ao abrir a URL de produção.
- `ngsw-worker.js` retornando 404 na aba Network ao abrir o site em produção.

**Fase a abordar:**
Fase de scaffold/deploy inicial — a checagem de instalabilidade deve ser critério de aceite da primeira fase que envolve deploy real na Vercel, repetida a cada mudança de manifest/ícones.

---

### Pitfall 11: Service worker do Angular servindo build antigo em cache, exigindo hard refresh

**O que dá errado:**
Após um novo deploy, usuários (incluindo o professor avaliando) continuam vendo a versão anterior do app, porque o Angular Service Worker (`ngsw-worker.js`) intencionalmente serve o conteúdo em cache primeiro e só atualiza em segundo plano — o usuário precisa recarregar a aba **duas vezes** (ou fechar/reabrir) para ver a nova versão, o que parece um bug durante a demonstração.

**Por que acontece:**
Esse é o comportamento *documentado e esperado* do Angular Service Worker: ele detecta a atualização via hash do `ngsw.json` no próximo carregamento, baixa a nova versão em paralelo, mas só a ativa no carregamento *seguinte* — por design, para não trocar código debaixo dos pés de uma sessão ativa.

**Como evitar:**
- Implementar escuta explícita de `SwUpdate.versionUpdates` no `AppComponent`/serviço de boot, filtrando por evento `VERSION_READY`, e oferecendo ao usuário um prompt/toast de "nova versão disponível, atualizar agora" que chama `document.location.reload()`.
- Garantir que o deploy de produção sempre gera um novo `ngsw.json` com hashes diferentes (isso é automático em build de produção real do `ng build`, mas pode falhar silenciosamente se o build não for de produção ou se algum asset não for versionado).
- Antes da apresentação final, fazer deploy com antecedência e visitar a URL algumas vezes para "aquecer" a versão mais nova em todos os dispositivos que serão usados na banca — evita o susto do hard refresh ao vivo.

**Sinais de alerta:**
- Mudança visível no código não aparece após deploy, mas aparece após um segundo refresh manual.
- Nenhum listener de `SwUpdate` implementado no código (`grep -rn "SwUpdate" src/app` vazio).

**Fase a abordar:**
Fase de deploy/PWA — implementar o listener de atualização junto com a configuração inicial do service worker, não deixar para depois.

---

### Pitfall 12: 404 em rotas profundas (deep link) no deploy da Vercel por falta de rewrite de SPA

**O que dá errado:**
Acessar diretamente uma URL como `/join/<token>` ou `/group/<id>/manage` (em vez de navegar a partir da home) retorna 404 da Vercel, porque por padrão a Vercel serve arquivos estáticos 1:1 com o caminho da URL — e esses caminhos não existem como arquivos físicos no `dist/`, só existem como rotas do Angular Router do lado do cliente.

**Por que acontece:**
Uma SPA depende de todas as rotas caírem no mesmo `index.html`, que carrega o Angular Router e só então decide o que renderizar com base na URL — sem uma regra de rewrite explícita, a Vercel tenta (e falha) encontrar um arquivo físico correspondente à rota.

**Como evitar:**
- Criar `vercel.json` na raiz do projeto com uma regra de rewrite genérica redirecionando todo caminho para `index.html`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
- Testar especificamente o caso de uso central do produto: compartilhar um link de convite (`/join/<token>`) e abri-lo direto no navegador (sem navegar primeiro pela home) — esse é literalmente o fluxo de entrada de todo participante que não é o admin, então um 404 aqui quebra o produto inteiro para a maioria dos usuários.

**Sinais de alerta:**
- 404 da Vercel (página de erro genérica, não do Angular) ao colar qualquer URL de rota interna direto no navegador.
- Ausência de `vercel.json` no repositório.

**Fase a abordar:**
Fase de deploy inicial — o teste de "abrir link de convite direto, sem navegação prévia" deve ser critério de aceite explícito antes de considerar o deploy funcional.

---

### Pitfall 13: Diretório de saída do build (`dist/<app>/browser`) desalinhado com a configuração da Vercel

**O que dá errado:**
Desde a adoção do "application builder" (`@angular-devkit/build-angular:application`, padrão em projetos criados com Angular 17+), o build de produção gera os artefatos estáticos em `dist/<nome-do-app>/browser/`, não em `dist/<nome-do-app>/` como em builders mais antigos. Se a configuração de "Output Directory" na Vercel (ou um `vercel.json` escrito copiando um tutorial antigo) apontar para `dist/<nome-do-app>/`, o deploy "funciona" (não dá erro), mas serve uma pasta sem o `index.html` certo, resultando em tela branca ou 404 em produção mesmo com o build local aparentemente correto.

**Por que acontece:**
A mudança de estrutura de pastas do builder é recente o suficiente para que muito conteúdo de tutorial/treinamento ainda assuma o layout antigo.

**Como evitar:**
- Após o primeiro `ng build` de produção, confirmar manualmente o caminho real gerado: `ls dist/*/browser/index.html` deve existir.
- Configurar explicitamente na Vercel (Project Settings → Build & Development Settings → Output Directory) o caminho `dist/<nome-do-app>/browser`, e replicar o mesmo caminho em `outputDirectory` no `vercel.json` se esse arquivo for usado para configurar o build.
- Verificar isso novamente após qualquer upgrade de versão do Angular CLI, pois builders podem mudar de comportamento entre versões major.

**Sinais de alerta:**
- Build passa localmente e no log da Vercel, mas a URL de produção mostra tela branca ou 404.
- `vercel.json`/configuração do painel apontando para `dist/<app>` sem o sufixo `/browser`.

**Fase a abordar:**
Fase de deploy inicial — validar o caminho de output no primeiro deploy, antes de depender dele para qualquer outra fase.

---

### Pitfall 14: Variáveis de ambiente/chaves do Supabase ausentes ou erradas no build da Vercel

**O que dá errado:**
O Angular, por padrão, resolve `environment.ts`/`environment.prod.ts` em **tempo de build**, não em tempo de execução — ou seja, as variáveis de ambiente da Vercel (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`/`anon key`) precisam estar disponíveis **durante o `ng build`** executado pela Vercel, e precisam ser lidas por algum mecanismo (ex.: script de substituição de `environment.prod.ts`, ou `process.env` via um step de build customizado), porque o Angular puro não lê `.env` nativamente como frameworks Node fazem.

**Por que acontece:**
Confundir variáveis de ambiente de runtime (comuns em backends Node) com o modelo de build estático do Angular — sem um passo explícito de geração de `environment.prod.ts` a partir de variáveis de ambiente antes do `ng build`, a aplicação pode ir para produção com a URL/chave do Supabase de desenvolvimento hardcoded, ou vazia.

**Como evitar:**
- Definir as variáveis `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (ou nome equivalente) no painel da Vercel (Project Settings → Environment Variables), separadas por ambiente (Production/Preview/Development).
- Usar um script de build (ex.: `scripts/set-env.ts` executado antes do `ng build`, ou a abordagem oficial do Angular com `fileReplacements` + um arquivo gerado) que escreve essas variáveis no `environment.prod.ts` antes da compilação — nunca commitar a chave real em `environment.prod.ts` versionado.
- Confirmar, após o primeiro deploy, que a chave realmente usada em produção é a de produção (inspecionando o bundle ou testando login real), não um valor de fallback vazio.

**Sinais de alerta:**
- Erro de rede/CORS/401 ao chamar o Supabase a partir da URL de produção, mas funcionando local.
- `environment.prod.ts` commitado no Git contendo uma chave (mesmo que seja só a `anon`/`publishable`, isso indica ausência de processo de build de variáveis).

**Fase a abordar:**
Fase de deploy inicial, junto com a configuração do `vercel.json`.

---

## Technical Debt Patterns

| Atalho | Benefício imediato | Custo de longo prazo | Quando é aceitável |
|--------|---------------------|------------------------|----------------------|
| Deixar confirmação de e-mail desabilitada no Supabase em produção | Facilita demonstração/teste | Qualquer pessoa pode criar conta com e-mail de terceiro sem verificação | Aceitável apenas em ambiente de demonstração acadêmica isolado; nunca em um deploy público real indefinido |
| Usar `effect()` em vez de `computed()` "porque já funciona" | Economiza decidir a API certa agora | Acumula indicadores perdidos (ID12 mal demonstrado) e comportamento sutilmente errado (loops, writes desnecessários) | Nunca — é tão barato corrigir quanto deixar errado, não há ganho real de tempo |
| Deixar `UNIQUE (group_id, giver_id)` fora do schema inicial "porque o fluxo de teste nunca clica duas vezes" | Menos uma linha de migration agora | Risco real de corromper o core value (sorteio duplicado) no pior momento possível: a demonstração ao vivo | Nunca — é uma linha de SQL, custo de adicionar é quase zero |
| Pular o teste de RLS com usuário "não-admin tentando ler draw de outro" até o final | Avança mais rápido nas telas | Pode descobrir no fim que a arquitetura de RLS escolhida não suporta a regra sem redesenho de policy | Só na primeira iteração do protótipo, nunca antes da entrega |

## Integration Gotchas

| Integração | Erro comum | Abordagem correta |
|------------|--------------|---------------------|
| Supabase Auth | Assumir que `getSession()` já resolveu sincronamente no boot do app | Tratar estado de auth como `'loading' | 'authenticated' | 'unauthenticated'`, nunca booleano, e aguardar resolução antes do guard decidir |
| Supabase Edge Functions | Function agir como proxy fino que repassa a `service_role` ao client, ou aceitar qualquer chamada sem validar o JWT do usuário | Function sempre valida o JWT do chamador (usuário autenticado real) antes de usar a `service_role`/`secret` internamente para o `INSERT` dos pares |
| Supabase RLS | Escrever a policy pensando "o que o admin precisa ver" em vez de "o que cada linha realmente deveria revelar" | Desenhar a policy por linha (`giver_id = auth participant`), não por papel do usuário |
| Vercel + Angular builder | Copiar `vercel.json` de um tutorial com `dist/<app>` sem `/browser` | Confirmar o caminho real gerado por `ng build` antes de configurar o output directory |
| Angular Service Worker | Assumir que "funciona no `ng serve`" prova que o PWA está OK | Testar instalabilidade e atualização sempre contra o build de produção já deployado |

## Performance Traps

| Trap | Sintomas | Prevenção | Quando quebra |
|------|----------|-----------|----------------|
| `@for` sem `track` apropriado (usando índice em vez de `id` estável) | Re-renderização de toda a lista de participantes a cada pequena mudança | Usar `track participant.id`, nunca `track $index`, para listas que mudam (participantes entrando/saindo) | Perceptível já com listas de 10+ participantes re-renderizando a cada poll/realtime update |
| Consultar o Supabase sem filtro de colunas (`select('*')`) em componentes que só precisam de 1-2 campos | Payloads maiores, mais lento em mobile | Especificar colunas explícitas no `select()` | Mais relevante em 3G/4G mobile-first, critério não-funcional do próprio PRD |

## Security Mistakes

| Erro | Risco | Prevenção |
|------|-------|-----------|
| `service_role`/`sb_secret_` key em `environment.ts` ou qualquer código que roda no browser | Qualquer usuário lê a tabela `draw` inteira — quebra total do core value | Secret key só em ambiente de Edge Function; grep em CI contra o `dist/` de produção |
| Policy `using (true)` "temporária" em qualquer tabela, deixada por esquecimento | Exposição total da tabela a qualquer usuário autenticado (ou até anônimo, se aplicada a `anon` role) | Nunca usar `using (true)` fora de tabelas verdadeiramente públicas (nenhuma tabela deste projeto é); revisar todas as policies antes de cada entrega como checklist explícito |
| RLS desabilitada em uma tabela recém-criada (comportamento padrão do Postgres: tabela nova não tem RLS habilitada por padrão no Supabase) | Tabela fica acessível sem nenhuma política, dependendo só da autenticação de API | `ALTER TABLE <nome> ENABLE ROW LEVEL SECURITY;` deve ser parte obrigatória de toda migration que cria tabela — checagem: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';` deve mostrar `true` para todas as 4 tabelas do projeto |
| Admin com policy especial de leitura em `draw` "só para debug" deixada no código final | Reintroduz exatamente o problema que o projeto existe para resolver | Nenhuma policy de `draw` deve mencionar `admin_id`/papel de admin — testar explicitamente o caso negativo (admin tentando ler) como parte do critério de aceite |

## UX Pitfalls

| Pitfall | Impacto no usuário | Abordagem melhor |
|---------|----------------------|----------------------|
| Botão "iniciar sorteio" sem feedback de carregamento/confirmação | Usuário clica múltiplas vezes por achar que não funcionou, ou tem medo de errar numa ação irreversível | Modal de confirmação explícita ("essa ação não pode ser desfeita") + desabilitar botão imediatamente + spinner até resposta da Edge Function |
| Revelar o par sorteado sem nenhuma "fricção" (aparece direto na tela ao entrar) | Perde o elemento de expectativa/revelação que o PRD descreve como "de forma oculta" | Implementar o padrão "revelação deliberada" (ex.: botão "revelar meu amigo secreto" com animação), que também é uma boa oportunidade de demonstrar `@defer` (ID8) carregando esse componente só quando solicitado |
| Mensagens de erro genéricas do Supabase (`"new row violates row-level security policy"`) exibidas crua para o usuário final | Usuário não entende o que fazer | Interceptor funcional (ID22) mapeia erros conhecidos do Supabase para mensagens em PT-BR amigáveis antes de chegar na UI |

## "Looks Done But Isn't" Checklist

- [ ] **Autenticação:** "Login funciona" — verificar também logout, F5 em rota protegida mantendo sessão, e tentativa de acessar rota protegida deslogado sendo redirecionada (não só o caminho feliz).
- [ ] **RLS:** "Dados aparecem certo na tela para o admin" — verificar também logando como um segundo usuário (participante comum) e tentando ler a tabela `draw` de outro participante via chamada direta ao Supabase client no console do browser.
- [ ] **PWA:** "Manifest existe no `dist/`" — verificar instalabilidade real no Lighthouse contra a URL de produção deployada, não contra `ng serve`.
- [ ] **Sorteio:** "Sorteio roda e preenche a tabela `draw`" — verificar também: clique duplo não duplica, grupo com menos de 3 participantes é bloqueado, tentar iniciar sorteio pela segunda vez no mesmo grupo é bloqueado, e novos participantes não conseguem entrar após o sorteio.
- [ ] **Deploy:** "Build local funciona" — verificar deep link direto (`/join/<token>`) na URL de produção da Vercel, não só a home.
- [ ] **Checklist/rubrica:** "O app funciona de ponta a ponta" — rodar `npx eslint src --max-warnings=0` com as regras do Pitfall 1 e também vistoriar manualmente os IDs sem cobertura de lint (`model()`/`ngModel`, `BehaviorSubject`, `effect()` vs `computed()`, guards/interceptors funcionais) antes de considerar qualquer fase "pronta".

## Recovery Strategies

| Pitfall | Custo de recuperação | Passos de recuperação |
|---------|------------------------|---------------------------|
| Sintaxe antiga (`*ngFor`, `@Input()`, construtor DI) espalhada pelo código | BAIXO/MÉDIO | Ativar as regras de lint com `--fix` (`prefer-signals`, `prefer-signal-model`, `prefer-standalone` suportam autofix); revisar manualmente `prefer-inject` e `prefer-control-flow`, que podem não ter autofix completo |
| RLS com recursão infinita descoberta tarde | MÉDIO | Isolar a policy problemática, reescrevê-la usando função `SECURITY DEFINER`, testar isoladamente via SQL antes de reconectar ao frontend |
| `service_role` key descoberta vazada em um commit antigo | ALTO | Revogar/regenerar a chave imediatamente no dashboard do Supabase (Settings → API), atualizar a Edge Function com a nova chave, e considerar o histórico de Git comprometido (a chave antiga continua no histórico mesmo após remover do HEAD) |
| Sorteio duplicado detectado em um grupo (falha da proteção de corrida) | MÉDIO | Adicionar a constraint `UNIQUE (group_id, giver_id)` retroativamente, limpar manualmente os pares duplicados via SQL, e corrigir a lógica da Edge Function antes de reabrir o grupo para novo sorteio |
| Deploy "funciona" mas PWA não é instalável na entrega final | BAIXO | Corrigir manifest/ícones, forçar novo deploy, revalidar com Lighthouse — é tipicamente um ajuste de configuração, não de arquitetura |

## Pitfall-to-Phase Mapping

| Pitfall | Fase de prevenção | Verificação |
|---------|----------------------|----------------|
| Sintaxe antiga do Angular (Pitfall 1) | Scaffold inicial | `npx eslint src --max-warnings=0` passando no CI de toda PR |
| `NgModule` reaparecendo (Pitfall 2) | Scaffold inicial | `find src -iname "*.module.ts"` vazio; `@angular-eslint/prefer-standalone` ativo |
| `effect()` vs `computed()` (Pitfall 3) | Implementação de `AuthService`/`DrawService` | Revisão manual de cada `effect(` em PR; `@angular-eslint/computed-must-return` ativo |
| Recursão em RLS (Pitfall 4) | Modelagem do banco/RLS | Cada policy testada isoladamente via SQL com usuário simulado antes de integrar ao frontend |
| `service_role` vazando (Pitfall 5) | Setup de ambiente/Supabase | Grep em CI contra `dist/` de produção; `.env*` no `.gitignore` desde o primeiro commit |
| UI escondendo em vez de RLS proteger (Pitfall 6) | Modelagem RLS + tela de resultado do sorteio | Teste de autenticação cruzada: usuário B não lê linha de usuário A via client direto |
| Corrida no "iniciar sorteio" (Pitfall 7) | Implementação da Edge Function de sorteio | Teste de duplo clique; `UNIQUE (group_id, giver_id)` na migration inicial |
| Sessão não restaurada no refresh (Pitfall 8) | Implementação de `AuthService`/guards | Teste manual de F5 em rota protegida sem flash de redirecionamento |
| Confirmação de e-mail bloqueando login (Pitfall 9) | Setup do Supabase | Decisão documentada no README; contas de demonstração pré-confirmadas antes da banca |
| PWA não instalável (Pitfall 10) | Scaffold/primeiro deploy | Lighthouse PWA contra URL de produção, sem erros de manifest |
| Cache do service worker servindo build antigo (Pitfall 11) | Configuração do PWA | Listener de `SwUpdate.versionUpdates`/`VERSION_READY` implementado |
| 404 em deep link na Vercel (Pitfall 12) | Primeiro deploy | `vercel.json` com rewrite testado abrindo `/join/<token>` direto na URL de produção |
| Output directory errado (`dist/<app>/browser`) (Pitfall 13) | Primeiro deploy | Confirmar `ls dist/*/browser/index.html` e configuração da Vercel apontando para esse caminho |
| Variáveis de ambiente/chaves ausentes no build da Vercel (Pitfall 14) | Primeiro deploy | Login real funcionando na URL de produção, não só local |

## Sources

- [angular-eslint/angular-eslint — eslint-plugin rules directory](https://github.com/angular-eslint/angular-eslint/tree/main/packages/eslint-plugin/docs/rules) — ALTA confiança (repositório oficial, listagem de arquivos de regra consultada diretamente)
- [angular-eslint/angular-eslint — eslint-plugin-template rules directory](https://github.com/angular-eslint/angular-eslint/tree/main/packages/eslint-plugin-template/docs/rules) — ALTA confiança (idem)
- [prefer-control-flow.md (eslint-plugin-template)](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin-template/docs/rules/prefer-control-flow.md) — ALTA confiança (documentação oficial da regra)
- [prefer-inject.md (eslint-plugin)](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin/docs/rules/prefer-inject.md) — ALTA confiança
- [prefer-signals.md (eslint-plugin)](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin/docs/rules/prefer-signals.md) — ALTA confiança (confirma explicitamente que `BehaviorSubject` NÃO é detectado)
- [prefer-signal-model.md (eslint-plugin)](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin/docs/rules/prefer-signal-model.md) — ALTA confiança
- [banana-in-box.md (eslint-plugin-template)](https://github.com/angular-eslint/angular-eslint/blob/main/packages/eslint-plugin-template/docs/rules/banana-in-box.md) — ALTA confiança
- [Angular NG5002 "@for loop must have a 'track' expression"](https://www.codestudy.net/blog/angular-ng5002-for-loop-must-have-a-track-expression/) — ALTA confiança (corrobora que é erro de compilação, não de lint)
- [Fix: infinite recursion detected in policy (Supabase RLS)](https://www.guardlayer.io/blog/supabase-rls-infinite-recursion) — MÉDIA confiança (fonte da comunidade, mas consistente com múltiplas outras fontes e com o comportamento documentado do Postgres RLS)
- [Supabase Docs — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — ALTA confiança (documentação oficial)
- [Supabase Docs — Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys) — ALTA confiança (documentação oficial, confirma o cronograma de depreciação de `anon`/`service_role` ao longo de 2026)
- [Your anon and service_role keys expire at the end of 2026](https://aibreakingwire.com/platforms/supabase/guides/supabase-api-key-migration) — MÉDIA confiança (fonte secundária, mas alinhada à doc oficial)
- [Angular Docs — Service worker devops](https://angular.dev/ecosystem/service-workers/devops) — ALTA confiança (documentação oficial sobre `SwUpdate`/`VERSION_READY` e comportamento de cache)
- [itishermann.me — Fixing the Mysterious 404 When Deploying Angular 19 to Vercel](https://itishermann.me/fixing-the-mysterious-404-when-deploying-angular-19-to-vercel) — MÉDIA confiança (comunidade, mas consistente com a mudança documentada do application builder para `dist/<app>/browser`)
- [Vercel — Why is my deployed project giving a 404?](https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404) — ALTA confiança (documentação oficial da Vercel sobre rewrites de SPA)
- [Stop Duplicate Records: Fix Race Conditions Using Unique Database Indexes](https://medium.com/@itsvinayc/race-conditions-in-web-apps-and-how-a-unique-index-can-save-you-736d682dabfb) — MÉDIA confiança (comunidade, padrão `UNIQUE constraint` + `ON CONFLICT` é prática padrão amplamente documentada no próprio Postgres)

---
*Pesquisa de pitfalls para: UTF-Secret (Amigo Secreto — Angular 17+/Supabase PWA, projeto acadêmico avaliado por rubrica)*
*Pesquisado em: 2026-10-14*
