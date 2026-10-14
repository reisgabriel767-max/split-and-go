# Split&Go

MVP para organizar despesas de grupos, calcular saldos individuais e sugerir um plano de acerto entre participantes.

## Status

Primeiro fluxo implementado com Next.js 16, React 19, TypeScript e PostgreSQL: criar grupos, cadastrar participantes, registrar despesas com rateio igualitario, consultar saldos e extratos individuais. Os dados persistem entre recargas.

Ainda faltam rateio percentual e por valor fixo, conversao entre moedas e plano otimizado de transferencias. Nesta etapa, cada despesa usa a moeda base do grupo (BRL, USD ou EUR). Nao ha autenticacao, edicao ou exclusao de lancamentos; o ambiente atual e uma demonstracao local.

## Arquitetura proposta

Uma aplicacao fullstack evita manter dois projetos e dois deployments no MVP. Next.js atende a interface React e os endpoints no mesmo projeto; TypeScript ajuda a explicitar os contratos; PostgreSQL oferece transacoes e integridade entre grupos, participantes, despesas e rateios.

```mermaid
flowchart LR
    Browser[Navegador - React] --> App[Next.js - interface e endpoints]
    App --> Domain[Regras de rateio, moedas e saldos]
    Domain --> Data[Camada de persistencia]
    Data --> DB[(PostgreSQL)]
```

O navegador chama `GET/POST /api/groups`. O servidor valida os dados com Zod e calcula o rateio em `src/lib/money.ts`; a persistencia grava uma despesa e suas partes na mesma transacao. A interface deriva saldos e extratos dos lancamentos e partes gravados. Credenciais do banco ficam somente no servidor.

O desenvolvimento local usa a aplicacao Node.js com PostgreSQL embarcado (PGlite) por padrao, sem Docker. Quando `DATABASE_URL` esta definida, a mesma camada de persistencia usa `pg` para conectar ao PostgreSQL externo. `compose.yaml` prepara esse banco; esse caminho ainda nao foi executado neste computador, que nao possui Docker disponivel. Producao exige `DATABASE_URL`; o fallback embarcado e restrito a desenvolvimento e testes. O deploy sera definido depois da implementacao. Filas e cache nao sao necessarios para este recorte.

### Modelo de dados previsto

- `Group`: nome e moeda base.
- `Member`: nome e grupo ao qual pertence.
- `Expense`: grupo, descricao, pagador, moeda, total original, total convertido e taxa de cambio aplicada.
- `ExpenseShare`: participante e valor devido na moeda base; a soma das partes deve corresponder ao total convertido.

O pagador e todos os participantes de uma despesa devem pertencer ao grupo. Um membro referenciado por despesas nao pode ser excluido sem tratamento dos lancamentos existentes. O plano de acerto e uma sugestao calculada; registrar pagamentos efetivos fica fora da primeira entrega.

### Regras financeiras

- Valores monetarios serao inteiros em unidades minimas da moeda, sem calculos financeiros com ponto flutuante binario.
- O primeiro recorte suporta BRL, USD e EUR, todas com duas casas decimais.
- Cada despesa registra a taxa manual usada na conversao para a moeda base. A taxa representa unidades da moeda base por uma unidade da moeda original; despesas na moeda base usam taxa 1.
- A conversao usa aritmetica decimal e arredondamento half-up uma unica vez. O rateio opera sobre o total convertido.
- No rateio igualitario ou percentual, centavos restantes sao distribuidos pelo metodo dos maiores restos, com desempate por identificador estavel do participante. Percentuais sao expressos em pontos-base e devem somar 10.000 (100%).
- Valores fixos sao informados na moeda base e devem somar exatamente o total convertido.
- Saldo individual = total pago na moeda base menos total devido. A soma dos saldos do grupo deve ser zero.

### Plano de acerto

A implementacao inicial separara credores e devedores e combinara os maiores saldos, transferindo o menor valor entre cada par ate zerar todos os saldos. Isso elimina cadeias de dividas e produz no maximo `n - 1` transferencias para `n` participantes com saldo diferente de zero.

Essa estrategia gulosa nao garante o minimo global de transferencias para todos os conjuntos de saldos. O case pede minimizacao; antes de concluir essa tarefa, sera necessario implementar uma busca exata para grupos pequenos ou registrar e justificar uma decisao de escopo que atenda a avaliacao. A tarefa permanece aberta no backlog.

### Casos de borda

| Caso | Tratamento previsto |
| --- | --- |
| R$ 10,00 divididos entre tres pessoas | Distribuir 334, 333 e 333 centavos com desempate estavel. |
| Percentuais diferentes de 100% ou valores fixos inconsistentes | Rejeitar a despesa e mostrar a diferenca antes de salvar. |
| Cotacao ausente, zero ou negativa | Rejeitar despesas estrangeiras ate informar uma taxa valida. |
| Taxa de cambio muda depois do registro | Preservar a taxa da despesa; nao recalcular o historico automaticamente. |
| Grupo sem despesas ou com saldos zerados | Exibir estado vazio ou grupo quitado, sem transferencias de valor zero. |

### Evolucao do produto

1. Convites e contas de usuario: permitir colaboracao segura e uso recorrente dos grupos.
2. Integracao de cotacoes com registro da fonte e data: reduzir digitacao e erros de conversao.
3. Registro de pagamentos e lembretes: acompanhar a quitacao efetiva e reduzir esquecimentos.

## Escopo inicial

- Cadastro de grupos e participantes.
- Registro de despesas com um pagador e varios participantes.
- Rateio igualitario, por percentual ou por valor fixo.
- Registro de moedas e conversao para a moeda base do grupo.
- Extrato individual e calculo dos saldos.
- Plano de acerto com reducao de transferencias.

## Organizacao

O backlog esta em [docs/backlog.md](docs/backlog.md) e nas [issues do repositorio](https://github.com/reisgabriel767-max/split-and-go/issues).

O [quadro Split&Go - MVP](https://github.com/users/reisgabriel767-max/projects/1) usa as colunas Backlog, In Progress, In Review, Testing e Done. O quadro permanece privado por decisao do responsavel; antes da entrega, sera necessario disponibilizar acesso de leitura aos avaliadores conforme os requisitos do case.

Os commits devem ser pequenos e descrever mudancas reais, seguindo Conventional Commits e referenciando as issues relacionadas, por exemplo: `feat: add group creation (#2)` ou `fix: preserve cents when splitting expenses (#3)`.

## Execucao local

Requisito: Node.js 20.9 ou superior, com npm.

```sh
npm ci
npm run dev
```

Abra `http://127.0.0.1:3000`. Na primeira requisicao, o banco e o esquema sao criados automaticamente. O banco local fica em `.data/postgres/`, ignorado pelo Git. Execute apenas uma instancia da aplicacao sobre esse diretorio. Os testes usam um banco separado em memoria, sem alterar dados da demonstracao. Nao use a demonstracao sem autenticacao como ambiente publico de producao.

### PostgreSQL via Docker

Com Docker instalado:

```sh
docker compose up -d --wait
```

Copie `.env.example` para `.env.local`, ative a linha `DATABASE_URL` e reinicie `npm run dev`. O PostgreSQL e publicado apenas em `127.0.0.1:5432`. A senha de `compose.yaml` e exclusiva da demonstracao local. O volume `splitgo_data` preserva os dados; alternar entre os bancos nao transfere os registros automaticamente.

### Verificacao

```sh
npm test
npm run typecheck
npm run build
```

Os testes cobrem valores decimais, preservacao de centavos, membros duplicados, datas invalidas, associacao ao grupo, gravacao transacional e manutencao de partes historicas ao adicionar participantes. A interface foi verificada em desktop e celular, incluindo criacao de grupo, despesa, saldos e recarga com dados persistidos. O build de producao foi verificado; a conexao com PostgreSQL externo via Docker continua pendente.

O esquema inicial esta em `db/001_initial.sql` e e aplicado de forma idempotente. Mudancas futuras exigirao migracoes versionadas; alterar esse arquivo nao migra tabelas existentes.

### Estrutura

- `src/app`: interface e endpoints Next.js.
- `src/components/workspace.tsx`: grupos, formularios, despesas e extratos.
- `src/lib/money.ts`: parse monetario e rateio em centavos.
- `src/lib/db.ts`: conexao e transacoes com PGlite ou PostgreSQL.
- `db/001_initial.sql`: tabelas, chaves estrangeiras e restricoes.
- `tests`: testes de dominio e integracao dos endpoints com PostgreSQL embarcado.

As fotografias de capa sao carregadas do Unsplash; a funcionalidade dos grupos nao depende delas.
