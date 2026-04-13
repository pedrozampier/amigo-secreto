# 📄 Product Requirements Document (PRD)

**Projeto:** UTF-Secret — Sistema de Amigo Secreto Online
**Versão:** 1.0.0
**Status:** 🟡 Em Definição (MVP)

---

## 🎯 1. Visão Geral e Objetivo

O **UTF-Secret** resolve o problema de organizar sorteios de Amigo Secreto de forma manual, presencial e sem privacidade. Muitas vezes o organizador acaba sabendo quem tirou quem, ou o processo é burocrático e sujeito a erros.

O sistema permite que um administrador crie um grupo online, convide participantes via link, e realize o sorteio de forma automatizada e **completamente privada**: cada participante vê apenas o próprio resultado, e o organizador não tem acesso aos pares sorteados.

**Objetivo principal:** oferecer uma plataforma web simples, segura e mobile-first para gerenciar sorteios de Amigo Secreto do cadastro ao resultado.

---

## 📖 2. Glossário Ubíquo

| Termo | Definição |
|:------|:----------|
| **Grupo** | Conjunto de participantes organizados para um sorteio específico. |
| **Administrador** | Usuário que cria e gerencia o grupo. Não vê os pares sorteados. |
| **Participante** | Membro de um grupo que participa do sorteio. |
| **Sorteio** | Processo automatizado que gera pares aleatórios e únicos entre participantes. |
| **Par Sorteado** | Resultado individual de um participante (quem ele/ela deve presentear). |
| **Lista de Desejos** | Texto opcional que um participante cadastra para sugerir presentes. |
| **Convite** | Link único gerado para que novos participantes entrem no grupo. |

---

## 👤 3. Atores e Permissões

| Ator | Descrição | Permissões |
|:-----|:----------|:-----------|
| **Administrador** | Cria o grupo e gerencia participantes | Criar grupo, gerar convite, remover participantes, iniciar sorteio, encerrar grupo |
| **Participante** | Membro do grupo | Entrar via convite, ver seu par sorteado, editar lista de desejos, ver lista de desejos dos outros |
| **Visitante** | Usuário não autenticado | Criar conta, entrar via link de convite |

---

## 📝 4. Escopo Funcional (User Stories)

### Autenticação
- Como **visitante**, eu quero criar uma conta com e-mail e senha para que eu possa acessar o sistema.
- Como **visitante**, eu quero fazer login com minha conta para que eu possa acessar meus grupos.

### Gestão de Grupos
- Como **administrador**, eu quero criar um grupo de Amigo Secreto para que eu possa organizar o sorteio.
- Como **administrador**, eu quero gerar um link de convite para que eu possa convidar os participantes.
- Como **administrador**, eu quero visualizar a lista de participantes do grupo para que eu possa acompanhar quem confirmou presença.
- Como **administrador**, eu quero remover um participante do grupo para que eu possa manter a lista correta.
- Como **administrador**, eu quero encerrar as inscrições e iniciar o sorteio para que o processo seja concluído.

### Participação
- Como **participante**, eu quero entrar em um grupo via link de convite para que eu possa participar do sorteio.
- Como **participante**, eu quero visualizar quem eu tirei no sorteio de forma oculta para que os outros não vejam e o segredo seja mantido.
- Como **participante**, eu quero cadastrar minha lista de desejos para que meu amigo secreto saiba o que me presentear.
- Como **participante**, eu quero visualizar a lista de desejos de quem tirei para que eu possa escolher um presente adequado.

---

## 🛡️ 5. Regras de Negócio (Constraints)

1. Um grupo precisa de **no mínimo 3 participantes** para que o sorteio possa ser realizado.
2. O sorteio é **irreversível**: uma vez iniciado, não pode ser desfeito.
3. Nenhum participante pode ser sorteado para si mesmo.
4. O **administrador não tem acesso** aos pares sorteados — apenas cada participante vê o próprio resultado.
5. Um participante só pode pertencer a um grupo por convite; o link de convite é de **uso único por e-mail**.
6. O sorteio só pode ser iniciado **uma única vez** por grupo.
7. Após o sorteio, novos participantes **não podem mais entrar** no grupo.
8. A lista de desejos é **opcional** e pode ser editada a qualquer momento antes do encerramento do grupo.

---

## 🚫 6. Fora de Escopo (Non-goals)

- Envio de notificações por **SMS**.
- Integração com redes sociais (login via Google/Facebook) — MVP usará apenas e-mail.
- Sistema de **chat** entre participantes.
- Sorteio com **restrições de pares** (ex: "A não pode tirar B").
- Aplicativo **mobile nativo** (iOS/Android) — apenas web responsivo.
- Pagamentos ou controle de **valor do presente**.
- **Histórico** de sorteios anteriores para participantes.

---

## ⚙️ 7. Requisitos Não Funcionais (Qualidade)

| Requisito | Detalhe |
|:----------|:--------|
| **Mobile-first** | Interface projetada primeiro para dispositivos móveis. |
| **Responsividade** | Funcionar bem em telas a partir de 320px. |
| **Acessibilidade** | Seguir diretrizes WCAG 2.1 nível AA. |
| **Performance** | Tempo de resposta inferior a 2s para operações críticas. |
| **Segurança** | Autenticação via Supabase Auth; RLS no banco para isolamento de dados. |
| **Disponibilidade** | SaaS gerenciado (Supabase + Vercel), meta de 99.5% uptime. |
| **Privacidade** | Os pares sorteados são armazenados de forma que apenas o próprio participante possa consultá-los (RLS). |

---

## 🛠️ 8. Tech Stack Principal (Diretrizes)

| Camada | Tecnologia |
|:-------|:-----------|
| **Frontend** | Angular 17+ (Standalone Components, Signals) |
| **Estilização** | Tailwind CSS + Spartan UI (HLM) |
| **Backend/BaaS** | Supabase (PostgreSQL + Auth + RLS) |
| **Deploy** | Vercel (Frontend) |
| **Versionamento** | GitHub (Git Flow simplificado: `main` + `develop`) |
