# Split&Go

MVP para organizar despesas de grupos, calcular saldos individuais e sugerir um plano de acerto entre participantes.

## Status

Fluxo implementado com Next.js 16, React 19, TypeScript e PostgreSQL: grupos, participantes, tres tipos de rateio, conversao de moedas com cotacao registrada, saldos, extratos e plano de acerto. Os dados persistem entre recargas.

O MVP suporta BRL, USD e EUR, com cotacao manual registrada por despesa. Novos grupos e inclusoes de membros respeitam o limite de 20 participantes, dentro da garantia de minimo global de transferencias. Grupos legados maiores permanecem acessiveis, com os limites descritos abaixo. Grupos podem ser excluidos com confirmacao, removendo tambem seus integrantes, despesas e rateios. O ambiente e local, sem autenticacao, edicao ou exclusao individual de lancamentos.

## Arquitetura atual

Uma aplicacao fullstack evita manter dois projetos e dois deployments no MVP. Next.js atende a interface React e os endpoints no mesmo projeto; TypeScript ajuda a explicitar os contratos; PostgreSQL oferece transacoes e integridade entre grupos, participantes, despesas e rateios.

```mermaid
flowchart LR
    Browser[React - Workspace e useWorkspace] --> HTTP[Route Handler - validacao e HTTP]
    HTTP --> Application[Casos de uso - application/groups.ts]
    Application --> Domain[Dominio - money, fx e settlement]
    Application --> Port[Contrato GroupRepository]
    SQL[SqlGroupRepository] -. implementa .-> Port
    SQL --> Adapter[Database - pg ou PGlite]
    Adapter --> DB[(PostgreSQL)]
    Browser --> Domain
```

O navegador chama `GET/POST/DELETE /api/groups` pelo cliente HTTP em `src/presentation/groups-client.ts`. O Route Handler valida a entrada com Zod e traduz respostas e erros, delegando a `createGroupUseCases` em `src/application/groups.ts`. Os casos de uso coordenam criacao e exclusao de grupo, inclusao de membro, registro de despesa e consulta do snapshot; dependem de `GroupRepository`, sem Next.js nem SQL.

`SqlGroupRepository`, em `src/infrastructure/`, implementa esse contrato com SQL parametrizado e o adaptador `Database`. Preserva escrita atomica, bloqueio do grupo com `FOR UPDATE` e leitura `REPEATABLE READ READ ONLY`. O dominio continua em `src/lib/money.ts`, `fx.ts`, `settlement.ts`, `types.ts` e `limits.ts`, sem React, HTTP ou banco. `src/lib/db.ts` apenas reexporta a infraestrutura para compatibilidade com testes e ferramentas existentes.

No frontend, `useWorkspace` controla estado, formularios, selecao e operacoes; `Workspace` compoe a tela, `GroupPanels` apresenta os paineis e `ExpenseList` organiza a tabela responsiva. As regras financeiras foram preservadas; a etapa visual posterior modernizou o CSS, os indicadores, formularios e navegacao por teclado. A rota e o ponto de composicao que escolhe o repositorio SQL e o gerador de IDs. Veja [docs/architecture.md](docs/architecture.md).

O desenvolvimento local usa a aplicacao Node.js com PostgreSQL embarcado (PGlite) por padrao, sem Docker. Quando `DATABASE_URL` esta definida, a mesma camada de persistencia usa `pg` para conectar ao PostgreSQL externo; esse caminho foi validado com PostgreSQL 18.4 nativo e PostgreSQL 17 em container no GitHub Actions. `compose.yaml` usa a mesma imagem PostgreSQL 17, mas o comando Compose nao foi executado neste computador, que nao possui Docker disponivel. Producao exige `DATABASE_URL`; o fallback embarcado e restrito a desenvolvimento e testes. Filas e cache nao sao necessarios para este recorte.

### Modelo de dados

- `Group`: nome e moeda base.
- `Member`: nome e grupo ao qual pertence.
- `Expense`: grupo, descricao, pagador, moeda, total original, total convertido e taxa de cambio aplicada.
- `ExpenseShare`: participante e valor devido na moeda base; a soma das partes deve corresponder ao total convertido.

O pagador e todos os participantes de uma despesa devem pertencer ao grupo. Um membro referenciado por despesas nao pode ser excluido sem tratamento dos lancamentos existentes. O plano de acerto e uma sugestao calculada; registrar pagamentos efetivos fica fora da primeira entrega.

### Regras financeiras

- Valores monetarios sao inteiros em unidades minimas da moeda, sem calculos financeiros com ponto flutuante binario.
- O primeiro recorte suporta BRL, USD e EUR, todas com duas casas decimais.
- Cada despesa registra a taxa manual usada na conversao para a moeda base. A taxa representa unidades da moeda base por uma unidade da moeda original; despesas na moeda base usam taxa 1.
- Taxas aceitam ate seis casas decimais e devem ser positivas. A despesa preserva `original_amount`, `original_currency` e `exchange_rate`; `amount` e o total convertido. O mesmo registro guarda a data da despesa e o instante da criacao. Taxas futuras nao alteram registros anteriores.
- A conversao usa aritmetica decimal e arredondamento half-up uma unica vez. O rateio opera sobre o total convertido.
- No rateio igualitario ou percentual, centavos restantes sao distribuidos pelo metodo dos maiores restos, com desempate por identificador estavel do participante. Percentuais sao expressos em pontos-base e devem somar 10.000 (100%).
- Valores fixos sao informados na moeda base e devem somar exatamente o total convertido.
- Percentuais aceitam ate duas casas decimais (por exemplo, 33,33%) e devem somar exatamente 100%; valores fixos devem fechar o total em centavos. A interface mostra os totais e a diferenca; o servidor valida novamente antes de gravar.
- Uma parte pode ser zero nos modos percentual e fixo. Quem nao participa e desmarcado; o pagador pode ficar fora do rateio. O modo e as partes de cada despesa ficam registrados; adicionar membros depois nao altera o historico.
- Saldo individual = total pago na moeda base menos total devido. A soma dos saldos do grupo deve ser zero.

### Plano de acerto

O plano elimina cadeias de divida a partir dos saldos liquidos. Primeiro, calcula uma solucao gulosa entre credores e devedores. Se a quantidade encontrada ja coincide com o limite inferior `max(numero de credores, numero de devedores)`, o minimo esta comprovado.

Nos demais casos com ate 20 saldos nao nulos, programacao dinamica por subconjuntos encontra a maior quantidade de componentes com soma zero. Cada componente de tamanho `k` precisa de `k - 1` transferencias; maximizar esses componentes minimiza o total global. Depois, o algoritmo reconstrui os componentes e as transferencias. Complexidade: tempo `O(n * 2^n)` e memoria `O(2^n)`, com desempates estaveis por identificador.

O cadastro de novos grupos e a adicao de participantes limitam o MVP a 20 membros. Assim, todo grupo criado nesse escopo fica dentro da garantia de minimo global. O limite e validado no servidor, inclusive quando duas inclusoes chegam ao mesmo tempo, e exibido na interface.

Grupos legados com mais de 20 membros nao sao excluidos nem truncados. Eles continuam permitindo consulta e lancamentos com ate 30 participantes, mas nao podem receber novos membros. Acima de 20 saldos nao nulos, a aplicacao usa o plano guloso, limitado a `n - 1` transferencias. Se o limite inferior nao comprovar o minimo, a tela mostra **Plano simplificado**, sem afirmar otimalidade. Essa compatibilidade nao amplia a garantia dos novos grupos. O plano e uma sugestao; o aplicativo nao efetua nem registra pagamentos reais.

Os testes comparam planos pequenos a uma busca exaustiva independente e incluem um caso em que o guloso gera cinco transferencias, mas o algoritmo exato encontra quatro, alem de um grupo no limite de 20 saldos.

### Casos de borda

| Caso | Tratamento implementado |
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

O [quadro publico Split&Go - MVP](https://github.com/users/reisgabriel767-max/projects/1) usa as colunas Backlog, In Progress, In Review, Testing e Done. A leitura e publica; edicao e administracao permanecem restritas as permissoes existentes.

O historico utiliza Conventional Commits, com os tipos `feat`, `fix`, `refactor` e `docs`. Commits de funcionalidades e correcoes incluem referencias a issues, como `feat: add group creation (#2)`. Os commits recentes de arquitetura e interface nao possuem referencia numerica a issue.

## Execucao local

Requisito: Node.js 20.9 ou superior, com npm.

```sh
npm ci
npm run dev
```

Abra `http://127.0.0.1:3000`. Na primeira requisicao, o banco e o esquema sao criados automaticamente. O banco local fica em `.data/postgres/`, ignorado pelo Git. Execute apenas uma instancia da aplicacao sobre esse diretorio. Por padrao, os testes usam um banco separado em memoria; a verificacao externa usa esquemas temporarios exclusivos. Nao use a demonstracao sem autenticacao como ambiente publico de producao.

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

A suite local tem 46 testes, incluindo exclusao de grupo, rollback e preservacao dos demais registros. Em 16/10/2026, passaram 45 no PGlite, com um caso de concorrencia externa ignorado, e todos os 46 no PostgreSQL 18.4 de testes. Tipos, build e fluxo HTTP compilado, incluindo DELETE, tambem passaram. A [CI publicada](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034) representa a versao anterior de 38 testes, sem a nova exclusao. A interface ainda nao possui verificacao visual nas larguras 1920, 1366, 768 e 390px; testes de HTML estatico nao substituem essa verificacao. O Compose local e seu volume persistente tambem nao foram testados.

### Validacao com PostgreSQL externo

Use uma instancia exclusiva de testes, com permissao para criar esquemas. No PowerShell, depois de disponibilizar esse banco:

```powershell
$env:SPLITGO_TEST_DATABASE_URL = "postgresql://splitgo:splitgo_local@127.0.0.1:5432/splitgo"
npm run test:postgres
npm run build
npm run test:production
Remove-Item Env:SPLITGO_TEST_DATABASE_URL
```

`test:postgres` repete os testes com esquemas isolados por arquivo e os remove ao terminar. `test:production` inicia a aplicacao compilada em `127.0.0.1:3100`, cria dados demonstrativos, verifica o fluxo HTTP e encerra o servidor e remove seu esquema temporario. A porta precisa estar livre; para usar outra, defina `SPLITGO_SMOKE_PORT`. Os comandos exigem `SPLITGO_TEST_DATABASE_URL`, sem fallback silencioso para o banco embarcado.

Os resultados observados e as pendencias estao em [docs/validation.md](docs/validation.md); a lista de entrega esta em [docs/delivery.md](docs/delivery.md).

A apresentacao esta nos [slides editaveis](docs/apresentacao-final.pptx). A [matriz de aderencia](docs/checklist-apresentacao.md) registra requisitos, evidencias e verificacoes pendentes.

### Integracao continua

O workflow [Validate SplitGo](https://github.com/reisgabriel767-max/split-and-go/actions) repete os testes embarcados, os testes externos com container PostgreSQL 17, o build e o teste HTTP de producao. Ele executa em push e pull request com alteracoes de codigo, e pode ser iniciado manualmente. Alteracoes apenas no README ou em docs/ nao repetem a suite automaticamente. As actions oficiais estao fixadas por commit, com permissao de leitura do repositorio.

O esquema evolui por arquivos SQL ordenados em `db/`. A tabela `schema_migrations` registra os arquivos ja aplicados; a inicializacao aplica os pendentes em transacao, com bloqueio dessa tabela. `002_split_modes.sql` adiciona o modo e os percentuais, preservando despesas existentes como igualitarias. Para futuras alteracoes, adicione uma nova migracao; nao edite migracoes aplicadas. Reinicie a aplicacao depois de adicionar migracoes.

### Exclusao de grupos

O icone de lixeira no cabecalho do grupo abre uma confirmacao com o nome do grupo. A exclusao requer a digitacao exata desse nome e remove permanentemente integrantes, despesas e rateios vinculados. Cancelamento e nomes divergentes nao enviam a requisicao.

`DELETE /api/groups` recebe `{ "groupId": "UUID-do-grupo" }` e responde HTTP 204 sem corpo. O schema exige um unico UUID, com verificacao de origem equivalente ao POST. A operacao bloqueia o grupo e remove despesas, partes, integrantes e grupo em uma transacao. Uma falha desfaz todas as remocoes. Repetir a exclusao de um ID inexistente retorna 204, sem afetar outros grupos.

### Contrato do rateio

Em `POST /api/groups`, uma despesa recebe `memberIds` e um campo `split`:

```json
{
  "mode": "percentage",
  "allocations": [
    { "memberId": "UUID-do-participante-1", "value": 6000 },
    { "memberId": "UUID-do-participante-2", "value": 4000 }
  ]
}
```

O campo `value` usa pontos-base no modo `percentage` (6000 = 60%) e centavos no modo `fixed`. As partes devem corresponder exatamente aos `memberIds`, sem faltantes, extras ou repeticoes. O modo `equal` usa apenas `{ "mode": "equal" }`. Omitir `split` assume divisao igualitaria. Os identificadores do exemplo sao ilustrativos; a API exige UUIDs de integrantes do grupo.

No cambio, `currency` identifica a moeda original e `exchangeRate` contem a taxa como texto decimal, por exemplo `"5.25"`. `amount` no pedido usa centavos da moeda original: USD 10,01 corresponde a `amount: 1001`; em um grupo BRL, a taxa 5,25 produz `amount: 5255` na resposta persistida, com `original_amount: 1001`. As partes fixas do pedido sempre usam centavos da moeda base. Omitir `currency` assume a moeda do grupo e taxa 1; despesas estrangeiras exigem cotacao explicita.

### Estrutura

- `src/app`: pagina, layout e Route Handler HTTP; composicao das dependencias no servidor.
- `src/presentation`: schemas e erros HTTP, cliente fetch e parsing de formulario.
- `src/application`: casos de uso, erros tipados e contratos de persistencia.
- `src/infrastructure`: repositorio SQL e adaptadores PostgreSQL/PGlite.
- `src/hooks/use-workspace.ts`: estado, selecao, formularios e interacoes.
- `src/components/workspace.tsx`: composicao visual e formularios; `group-panels.tsx`: paineis.
- `src/lib/money.ts`: parse monetario e rateio em centavos.
- `src/lib/fx.ts`: conversao decimal, validacao de taxas e arredondamento.
- `src/lib/settlement.ts`: saldos e plano de acerto.
- `src/lib/db.ts`: reexportacao compativel de `src/infrastructure/database.ts`.
- `db/001_initial.sql`: tabelas, chaves estrangeiras e restricoes.
- `tests`: dominio, aplicacao, apresentacao, fronteiras e integracao com ambos os bancos.

As fotografias de capa sao carregadas do Unsplash; a funcionalidade dos grupos nao depende delas.
