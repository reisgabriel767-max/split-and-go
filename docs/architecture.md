# Arquitetura atual e relatorio de refatoracao

Verificacao local: 16/10/2026. Monolito modular fullstack em Next.js 16.4.0. Nenhum commit ou push foi feito nesta refatoracao.

## Diagnostico inicial

- A rota de 245 linhas misturava protocolo HTTP, schemas, geracao de IDs, politicas de negocio, SQL, transacoes e tratamento de erros por mensagens de excecao.
- Workspace tinha 1055 linhas, reunindo carregamento, fetch, navegacao, formularios, calculos derivados e todos os paineis visuais.
- As regras de dinheiro e acerto ja estavam separadas de React e banco. Foram preservadas, sem renomeacoes apenas para criar uma pasta domain.
- Database ja isolava pg e PGlite. O problema era o SQL das operacoes continuar dentro do handler HTTP, nao a ausencia de um ORM.
- O frontend dependia de uma funcao de parsing exportada por um componente visual. Essa funcao agora pertence a presentation/expense-form.ts.

Antes de editar, foram lidos AGENTS.md, README, fontes, SQL, testes e guias locais do Next. A referencia inicial executada foi: 22 testes PGlite aprovados, um externo ignorado, typecheck aprovado e build aprovado.

## Estrutura antes

```text
src/
  app/api/groups/route.ts     HTTP, aplicacao e SQL juntos
  components/workspace.tsx    Estado, HTTP, formularios e paineis juntos
  components/expense-split.tsx
  components/currency-fields.tsx
  components/settlement-panel.tsx
  lib/
    db.ts                    Conexao, transacoes e migracoes
    money.ts, fx.ts, settlement.ts, types.ts, limits.ts
db/                          Tres migracoes
tests/                       23 testes, mais helper de banco
```

## Estrutura depois

```text
src/
  app/api/groups/route.ts           HTTP e composicao das dependencias
  application/
    groups.ts                      Quatro casos de uso e comandos tipados
    group-repository.ts            Contratos GroupRepository/GroupTransaction
    errors.ts                      ApplicationError e codigos explicitos
  infrastructure/
    database.ts                    Database, pg, PGlite e migracoes
    sql-group-repository.ts        SQL, mapeamentos, transacoes e locks
  presentation/
    groups-http.ts                 Zod, Origin e traducao de erros HTTP
    groups-client.ts               Cliente fetch tipado e testavel
    expense-form.ts                Textos do formulario para unidades exatas
  hooks/use-workspace.ts            Estado e coordenacao da interacao
  components/
    workspace.tsx                  Composicao visual e formularios
    group-panels.tsx                Despesas, saldos, extratos, membros e acerto
    expense-split.tsx               Campos e previas dos rateios
    currency-fields.tsx             Campos de cambio
    settlement-panel.tsx            Apresentacao das transferencias
  lib/
    money.ts, fx.ts, settlement.ts, types.ts, limits.ts  Dominio existente
    db.ts                          Reexportacao compativel da infraestrutura
db/                                Migracoes intactas
tests/                             34 testes, mais helper de banco
```

A rota ficou com 59 linhas; Workspace ficou com 655. Essa contagem mostra a separacao, mas nao e a prova de qualidade: o objetivo e que cada responsabilidade possa ser testada sem carregar as demais.

## Responsabilidades e dependencias

### Dominio

Os modulos financeiros de src/lib nao importam React, Next, HTTP, pg ou PGlite. Decimal.js continua como biblioteca aritmetica de fx.ts. As entidades/contratos existentes continuam em types.ts para evitar quebrar seus consumidores. O formato GroupData da interface foi reutilizado: nao foram criadas entidades duplicadas com nomes novos e o mesmo conteudo.

money.ts mantem centavos inteiros, percentuais em pontos-base, maiores restos e desempate por ID. fx.ts mantem HALF_UP antes do rateio, taxa historica e partes fixas na moeda base. settlement.ts mantem a busca exata ate 20 saldos ativos e o fallback legado identificado. Nenhuma dessas implementacoes foi alterada.

### Aplicacao

createGroupUseCases recebe um GroupRepository e uma funcao newId. Seus quatro casos de uso sao:

- createGroup: valida capacidade e nomes distintos e grava grupo/membros em uma unidade transacional.
- addGroupMember: bloqueia o grupo, verifica existencia e capacidade e insere o membro.
- createExpense: bloqueia o grupo, converte, rateia, verifica pertencimento e solicita a gravacao atomica da despesa e das partes.
- getGroupsSnapshot: consulta o snapshot pelo contrato de repositorio.

Os comandos sao TypeScript e nao contêm NextRequest ou NextResponse. Os formatos externos e dados textuais continuam sendo validados na fronteira HTTP com Zod. Os casos de uso recebem esses comandos normalizados e aplicam as politicas de coordenacao e dominio. A camada nao e um segundo schema HTTP e nao e um mecanismo de validacao de objetos arbitrarios enviados por outros runtimes.

ApplicationError explicita GROUP_NOT_FOUND, INVALID_MEMBERS, MEMBER_LIMIT, DUPLICATE_MEMBER e INVALID_INPUT. SplitError e CurrencyError continuam sendo falhas de dominio. Erros inesperados de infraestrutura nao viram sucesso nem sao expostos ao cliente.

### Infraestrutura

SqlGroupRepository implementa os contratos definidos pela aplicacao. GroupTransaction oferece operacoes de negocio, nao strings SQL: lockGroup, countMembers, memberIds, insertGroup, insertMember e insertExpense. ExpenseRecord usa campos explicitos; o repositorio os mapeia para colunas e parametros SQL. Os dados do snapshot mantem o DTO ja consumido pela interface.

O repositorio recebe uma funcao que resolve Database. Isso permite conexao tardia, testes com adaptadores reais e injecao controlada de falhas. Nao existe um repositorio singleton que capture uma conexao antiga. O estado global da conexao continua o mesmo, para preservar a inicializacao usada pelo Next e pelos testes existentes.

database.ts foi movido de lib para infrastructure sem alterar seus adaptadores, pool ou algoritmo de migracao. lib/db.ts reexporta Database, database e migrate por compatibilidade. Nao ha duas instancias globais ou dois caminhos de migracao.

Na escrita, repository.transaction delega a Database.transaction. O callback recebe um repositorio preso a essa mesma transacao. insertExpense grava a despesa e todas as partes ali. Uma falha posterior desfaz tudo. O codigo SQL 23505 vira DUPLICATE_MEMBER depois do rollback; o handler nao conhece codigos do driver.

getSnapshot usa REPEATABLE READ READ ONLY antes das quatro consultas. lockGroup usa SELECT ... FOR UPDATE antes de contagem ou alteracao. Foram preservadas as consultas, a ordenacao e a representacao de data e taxa no JSON. Nao houve nova migracao, alteracao de chave ou mudanca no banco demonstrativo.

### Apresentacao

A rota e o ponto de composicao do servidor: escolhe SqlGroupRepository, database e randomUUID. Fora dessa composicao, trata apenas HTTP e delega. groups-http.ts concentra os schemas, a verificacao Origin e a traducao de falhas. groups-client.ts concentra URL, no-store, JSON, fetch e mensagens de erro para o cliente.

useWorkspace guarda o estado e coordena carga, selecao, formularios, previas, envio e refresh. Workspace mantem a estrutura de pagina e o JSX dos formularios. GroupPanels recebe props e apresenta as abas; Avatar e compartilhado nesse arquivo. Os demais componentes visuais continuam com suas responsabilidades anteriores. expense-form.ts permite testar parsing sem importar React. expense-split.tsx reexporta readSplitSpec para compatibilidade com seu caminho anterior.

Nao foram alterados CSS, identidade visual, textos de fluxo ou modos de navegacao. Nao foi criado store global, framework de formularios ou biblioteca nova.

## Fluxo de registro de despesa

```text
Formulario em Workspace
  useWorkspace e parsing de presentation/expense-form.ts
  saveGroup em presentation/groups-client.ts
  POST /api/groups
  Zod e Origin em presentation/groups-http.ts
  createExpense em application/groups.ts
  GroupRepository.transaction
  GroupTransaction.lockGroup
  convertMoney e calculateSplit (dominio)
  verificacao dos IDs de membros
  GroupTransaction.insertExpense
  SqlGroupRepository: INSERT despesa + INSERTs das partes
  Database: COMMIT ou ROLLBACK
  HTTP 201 com id
  refresh do hook
  snapshot consistente, saldos e plano derivados
```

O frontend fecha o modal depois da confirmacao da escrita e antes do refresh, como antes. Uma falha posterior de leitura informa que os dados foram salvos; nao incentiva uma segunda gravacao. Isso nao e uma chave de idempotencia.

## Contratos preservados

- Mesmos GET/POST /api/groups, sem adicionar endpoints.
- GET retorna groups, members, expenses e shares, com os mesmos campos.
- POST recebe action=group/member/expense e responde 201 com id.
- Mantidos 400 para entrada/dominio, 403 para Origin invalido, 409 para nome duplicado e 503 para falha inesperada; mensagens anteriores preservadas.
- Moeda e split omitidos mantem os defaults existentes.
- Novos grupos limitados a 20, despesas legadas com ate 30 IDs aceitas, dados antigos preservados.
- Pagador pode ficar fora do rateio, mas deve pertencer ao grupo.
- Sem autenticacao, pagamentos, edicao/exclusao ou deploy adicionados.

## Principios aplicados sem formalismo adicional

- Responsabilidade unica: protocolo na rota/helpers, coordenacao nos casos de uso, SQL no repositorio, estado no hook e JSX nos componentes.
- Inversao de dependencias: aplicacao conhece GroupRepository; o SQL implementa esse contrato. Banco e gerador de IDs sao injetados.
- Segregacao de interfaces: casos de uso recebem operacoes relevantes ao grupo; nao recebem o driver ou uma API generica de SQL.
- Substituicao: testes de casos de uso usam um repositorio em memoria; a integracao valida a implementacao SQL nos dois adaptadores. Isso fornece evidencia comportamental, nao uma prova formal completa de Liskov.
- Aberto/fechado em uma fronteira concreta: pode-se substituir o adaptador de persistencia sem editar os casos de uso. Nao se afirma que qualquer nova regra de negocio dispensa alteracoes no codigo.
- Clean Architecture pragmatica: dependencias internas nao importam frameworks externos de apresentacao/persistencia. Nao foi criado um conteiner de DI nem uma classe por acao apenas para seguir um diagrama.

## Testes executados

| Etapa/comando | Resultado nesta refatoracao |
| --- | --- |
| Baseline npm test | 22 aprovados, 1 externo ignorado |
| Baseline typecheck e build | Aprovados |
| Apos separar backend, suite original | 22 aprovados, 1 externo ignorado |
| npm test com novos testes | 33 aprovados, 1 externo ignorado |
| npm run typecheck | Aprovado |
| npx tsc --noEmit --noUnusedLocals | Aprovado na verificacao da extracao |
| npm run build | Aprovado com backend e frontend refatorados |
| npm run test:postgres | 34 aprovados, sem ignorados |
| npm run test:production | Fluxo HTTP compilado aprovado |
| Navegador, instancia isolada | Grupo, tres rateios, cambio, recarga, extrato, inclusao de membro e acerto conferidos |
| Tela estreita, largura 390 | Conferida sem rolagem horizontal |

O PostgreSQL 18.4 de validacao usou apenas 127.0.0.1:55433 e esquemas exclusivos por arquivo/cenario. A UI compilada usou 127.0.0.1:3101 em outro schema temporario. Os esquemas foram removidos, a instancia de UI foi encerrada e o banco temporario foi parado; a consulta final encontrou zero schemas splitgo_ restantes.

Os testes novos sao:

- application.test.ts: quatro testes de coordenacao, IDs injetados, lock/capacidade, conversao antes do rateio, historico e validacao de membros.
- repository.test.ts: dois testes com banco real, incluindo falha depois de inserir a primeira parte e verificacao de rollback da despesa inteira, e traducao de duplicidade.
- presentation.test.ts: quatro testes de cliente HTTP, parsing, defaults/legados e traducao de erros/status.
- architecture.test.ts: um teste que inspeciona imports do dominio e aplicacao e rejeita dependencias de React, Next, drivers ou camadas externas.

Os sete arquivos de testes antigos foram preservados. A CI remota anterior continua documentada como evidencia historica da versao de 23 testes; esta refatoracao nao foi publicada nem executada na CI remota.

## Arquivos modificados e justificativa

| Arquivo/grupo | Mudanca |
| --- | --- |
| app/api/groups/route.ts | Remocao de SQL e coordenacao de negocio; composicao e HTTP |
| application/*.ts | Casos de uso, erros e contratos orientados as operacoes |
| infrastructure/database.ts | Codigo de banco movido, sem mudanca de comportamento |
| infrastructure/sql-group-repository.ts | SQL e garantias transacionais fora do HTTP |
| lib/db.ts | Reexportacao para nao quebrar imports antigos |
| presentation/groups-http.ts | Schemas e erros antes presentes na rota |
| presentation/groups-client.ts | Fetch extraido do componente e injetavel nos testes |
| presentation/expense-form.ts | Parsing extraido do componente visual |
| hooks/use-workspace.ts | Estado e coordenacao da interface |
| components/group-panels.tsx | JSX dos paineis extraido sem trocar classes CSS |
| components/workspace.tsx | Composicao visual consumindo hook/paineis |
| components/expense-split.tsx | Consome/reexporta o parser extraido |
| tests novos | Validacao das novas fronteiras e garantias |
| README e esta documentacao | Estrutura, fluxos, evidencias e limites atuais |

money.ts, fx.ts, settlement.ts, types.ts, limits.ts, globals.css, migracoes, package.json e package-lock.json nao foram alterados. O iniciador C#, executavel e scripts locais preexistentes foram preservados. Arquivos locais nao relacionados, incluindo .vs e o TXT anterior, nao foram removidos nem revertidos.

## Limitacoes e riscos remanescentes

- Workspace ainda contem o JSX dos formularios, e useWorkspace ainda coordena bastante estado. Extrair formularios tipados pode ser uma etapa futura quando houver complexidade real que justifique mais contratos.
- GroupData reutiliza os nomes de campos existentes. Nao houve um modelo de leitura novo com mapeamento de todos os campos para camelCase, pois isso mudaria contratos sem necessidade.
- A verificacao estatica de imports e util, mas nao substitui revisao de dependencias dinamicas ou de efeitos colaterais.
- Persistem os limites do MVP: sem autenticacao, idempotencia de escrita, paginacao, sincronizacao multiusuario automatica, backup operacional ou registro de pagamentos.
- O minimo global continua restrito a 20 saldos ativos; o cadastro atual fica dentro disso, mas legados maiores podem receber plano simplificado.
- O Compose local e seus volumes nao foram testados nesta etapa; foi usado PostgreSQL nativo exclusivo.
- Nao foi executado o teste do iniciador contra o banco demonstrativo nesta refatoracao. Seus arquivos ficaram intactos; o caminho Next utilizado por ele e os contratos de readiness foram preservados e a aplicacao compilada passou no smoke.
- Slides e relatorios antigos representam suas datas/versoes originais; o material atual para explicar esta arquitetura e este documento e o novo TXT refatorado.

## Sugestoes de commits na etapa original

Na etapa original nao houve commit automatico. Posteriormente o responsavel autorizou a publicacao; o fechamento e a CI estao em [delivery.md](delivery.md). A lista abaixo preserva o planejamento original.

1. refactor: extract group use cases and transactional SQL repository
2. refactor: separate workspace state and presentation panels
3. test: cover application boundaries and repository rollback
4. docs: describe modular architecture and local refactor validation

Antes de preparar qualquer commit, separar os arquivos preexistentes e gerados dos conjuntos acima. Nao incluir .vs, dados, credenciais ou o executavel local automaticamente.

## Explicacao para a Stage Consulting

O Split&Go continua sendo uma unica aplicacao Next.js. A camada de apresentacao traduz HTTP e interacoes do React. Os casos de uso coordenam as operacoes por contratos de persistencia. O dominio mantem as regras exatas de dinheiro, conversao e minimizacao sem depender do framework. A infraestrutura implementa esses contratos em PostgreSQL ou PGlite, preservando transacoes, locks e snapshots consistentes. A separacao permite testar uma regra ou um caso de uso sem iniciar a interface, sem adicionar complexidade de microsservicos ou alterar a experiencia do produto.
