*Competência: O aluno compreende que código sem usabilidade não tem valor e domina ferramentas de IA para acelerar o design (Design-to-Code), mantendo o rigor técnico da experiência do usuário.*

- **ID1:** Desenvolver protótipos navegáveis (ex: gerados via *Stitch* e refinados no *Figma*) que demonstram compreensão das diretrizes de usabilidade, com link público disponibilizado no repositório.
- **ID2:** Projetar interfaces responsivas com a abordagem *Mobile-First*, garantindo que o layout se adapte perfeitamente a diferentes resoluções (celulares, tablets e desktops).
- **ID3:** Projetar a experiência de aplicativo nativo (PWA), configurando o `manifest.webmanifest` (ícones, cores de tema, *splash screen* e modo de exibição *standalone*) e prevendo o comportamento visual da interface em estados offline.

RA2 - Componentização e UI Declarativa Moderna

*Competência: O aluno domina a construção de blocos visuais independentes, performáticos e reutilizáveis utilizando a arquitetura moderna do Angular.*

- **ID3:** Desenvolver componentes utilizando estritamente a arquitetura *Standalone* (sem o uso de `NgModules`).
- **ID4:** Incorporar e customizar componentes utilizando um Framework CSS moderno (ex: Tailwind CSS, PrimeNG).
- **ID5:** Aplicar a nova sintaxe de fluxo de controle (`@if` / `@switch`) para exibição condicional de elementos.
- **ID6:** Utilizar a nova sintaxe de fluxo de controle `@for` com a propriedade `track` obrigatória para a renderização dinâmica e otimizada de coleções.
- **ID7:** Aplicar *Pipes* (nativos ou customizados) para formatar a apresentação de dados na interface.
- **ID8:** Implementar *Deferrable Views* (`@defer`) para otimizar a performance, carregando componentes pesados apenas sob demanda.

RA3 - Reatividade e Gerenciamento de Estado (Signals)

*Competência: O aluno entende como o fluxo de dados altera a interface de forma reativa e granular, sem manipulação direta do DOM.*

- **ID9:** Aplicar técnicas de *one-way data binding* (Interpolação `{{ }}` e Property Binding `[ ]`) para exibir e atualizar dados, utilizando estritamente **Signals** (`writable` e `computed`) como fonte de estado.
- **ID10:** Aplicar técnicas de *event binding* `( )` para capturar interações do usuário e atualizar o estado da aplicação.
- **ID11:** Aplicar técnicas de *two-way data binding* utilizando a função moderna `model()` para sincronização bidirecional.
- **ID12:** Utilizar efeitos (`effect()`) para a manipulação segura de efeitos colaterais reativos.

RA4 - Arquitetura de Software e Injeção de Dependências

*Competência: O aluno sabe separar responsabilidades, isolando a lógica de negócios da camada de visualização.*

- **ID13:** Utilizar as funções modernas `input()` e `output()` para a comunicação segura e tipada entre componentes em uma hierarquia (pai/filho).
- **ID14:** Criar comunicação entre componentes não relacionados hierarquicamente extraindo a lógica para *Services*, utilizando a função `inject()` em vez de injeção via construtor.

RA5 - Roteamento e Navegação SPA (Single Page Application)

*Competência: O aluno consegue criar uma experiência de navegação fluida, segura e de alta performance.*

- **ID15:** Configurar rotas dinâmicas utilizando a API funcional moderna (`provideRouter` e `withComponentInputBinding`).
- **ID16:** Passar e consumir dados entre telas recebendo parâmetros de rota diretamente como `@Input()` nos componentes.
- **ID17:** Criar uma estrutura de navegação aninhada (rotas filhas) para representar hierarquias de layout.
- **ID18:** Aplicar *Functional Route Guards* para controle de acesso (autenticação) e *Resolvers* para pré-carregamento de dados antes da transição da tela.

RA6 - Integração de APIs e Assincronismo (BaaS)

*Competência: O aluno sabe conectar o frontend ao mundo externo, gerenciando requisições, segurança e estado assíncrono.*

- **ID19:** Realizar requisições assíncronas (GET) a uma API pública.
- **ID20:** Implementar o fluxo de Autenticação e Gerenciamento de Sessão (JWT) conectando a aplicação aos serviços de identidade do BaaS (ex: Supabase Auth).
- **ID21:** Realizar o ciclo completo de operações CRUD (GET, POST, PUT, PATCH, DELETE) conectando a aplicação a um *Backend-as-a-Service* (ex: Supabase, PocketBase).
- **ID22:** Implementar *Functional Interceptors* para injetar tokens de autenticação globalmente e tratar erros de forma centralizada.
- **ID23:** Aplicar validações em Formulários Reativos, exibindo mensagens de erro claras e desabilitando o botão de *submit* com base na validade do formulário.
- **ID24:** Fazer a ponte entre o assincronismo e a reatividade utilizando `toSignal()` e `toObservable()`, integrando RxJS com o ecossistema de Signals.

RA7 - Engenharia de Software, Versionamento e DevOps

*Competência: O aluno trabalha com padrões de mercado para gerenciamento de código, colaboração e entrega contínua.*

- **ID25:** Criar e gerenciar um repositório no GitHub utilizando a estrutura ágil do *Gitflow* (branches `main` e `develop`).
- **ID26:** Colaborar ativamente realizando integrações via *Pull Requests* e resolução de conflitos.
- **ID27:** Planejar, executar o processo de *build* moderno e realizar o deploy automatizado da aplicação em ambiente de produção (ex: GitHub Pages, Vercel).

RA8 - Engenharia de Software Assistida por IA (Spec-Driven Development e Orquestração)

*Competência: O aluno atua como Arquiteto de Software, utilizando a metodologia Spec-Driven Development (SDD) para planejar, especificar e orquestrar agentes de IA. Ele domina ferramentas avançadas (MCP, Skills) para gerar código de forma previsível, evitando o "Vibe Coding".*

- **ID28 - Escopo e Gestão Ágil:** Utilizar IA Generativa para a ideação e redação de *User Stories*. Cadastrar e gerenciar essas histórias como *Issues* em um Kanban no **GitHub Projects**.
- **ID29 - Fundações (PRD):** Apoiar-se na IA para criar a modelagem do banco de dados (Diagrama ER em sintaxe **Mermaid**) e definir o **Design System** base. Documentar esses artefatos no `README.md`, consolidando o *Product Requirements Document* (PRD).
- **ID30 - Especificação Técnica:** A partir do PRD, instruir a IA a gerar um documento de especificação rigoroso (`.spec.md`), detalhando explicitamente a arquitetura dos componentes *Standalone* e *Services* antes da geração do código fonte.
- **ID31 - Orquestração (MCP e Skills):** Configurar a IDE (ex: Antigravity) ativando Servidores **MCP** (Model Context Protocol, ex: Figma, Supabase) e utilizando **Skills** de Angular 20+ para que o Agente gere o código com o contexto exato do projeto.
- **ID32 - Validação e Testes (TDD):** Atuar como revisor técnico da IA. Orientar o agente a gerar testes unitários (`.spec.ts`) focados nas regras de negócio para validar rigorosamente a implementação gerada.
