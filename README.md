# Split&Go

MVP para organizar despesas de grupos, calcular saldos individuais e sugerir um plano de acerto entre participantes.

## Status

Fluxo implementado com Next.js 16, React 19, TypeScript e PostgreSQL: grupos, participantes, tres tipos de rateio, conversao de moedas com cotacao registrada, saldos, extratos e plano de acerto. Os dados persistem entre recargas.

O MVP suporta BRL, USD e EUR. A cotacao e manual. Novos grupos e inclusoes de membros respeitam o limite de 20 participantes, dentro da garantia de minimo global de transferencias. Grupos legados maiores permanecem acessiveis, com a ressalva descrita abaixo. Nao ha autenticacao, edicao ou exclusao de lancamentos; o ambiente atual e uma demonstracao local. Os testes passaram no PostgreSQL embarcado, no PostgreSQL 18 externo e no container PostgreSQL 17 da CI, incluindo a aplicacao compilada. Os materiais de apresentacao estao preparados; o ensaio, a videochamada e o acesso publico ao quadro continuam pendentes.

## Arquitetura proposta

Uma aplicacao fullstack evita manter dois projetos e dois deployments no MVP. Next.js atende a interface React e os endpoints no mesmo projeto; TypeScript ajuda a explicitar os contratos; PostgreSQL oferece transacoes e integridade entre grupos, participantes, despesas e rateios.

```mermaid
flowchart LR
    Browser[Navegador - React] --> App[Next.js - interface e endpoints]
    App --> Domain[Conversao e rateio no servidor]
    Domain --> Data[Camada de persistencia]
    Data --> DB[(PostgreSQL)]
    Browser --> Settlement[Saldos e plano de acerto no cliente]
```

O navegador chama `GET/POST /api/groups`. O servidor valida os dados com Zod, converte a moeda em `src/lib/fx.ts` usando Decimal.js e calcula o rateio em `src/lib/money.ts`; a persistencia grava uma despesa e suas partes na mesma transacao. O GET usa uma transacao somente de leitura com isolamento Repeatable Read, para retornar grupos, membros, despesas e partes do mesmo snapshot, mesmo com cadastros simultaneos. A interface deriva saldos, extratos e transferencias dos lancamentos e partes gravados usando `src/lib/settlement.ts`. Credenciais do banco ficam somente no servidor.

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

O [quadro Split&Go - MVP](https://github.com/users/reisgabriel767-max/projects/1) usa as colunas Backlog, In Progress, In Review, Testing e Done. O quadro permanece privado por decisao do responsavel; antes da entrega, sera necessario disponibilizar acesso de leitura aos avaliadores conforme os requisitos do case.

Os commits devem ser pequenos e descrever mudancas reais, seguindo Conventional Commits e referenciando as issues relacionadas, por exemplo: `feat: add group creation (#2)` ou `fix: preserve cents when splitting expenses (#3)`.

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

Os 23 testes cobrem rateios, cambio, historico, migracoes, plano de acerto, consistencia de leitura e limite de membros, incluindo compatibilidade com grupos legados maiores. No PGlite, 22 passam e o teste de duas conexoes concorrentes fica ignorado. A suite anterior de 21 testes passou no PostgreSQL externo e na CI com container PostgreSQL 17, incluindo o fluxo HTTP compilado. A ampliacao para o limite de membros ainda aguarda sua execucao remota. A interface foi verificada em desktop e celular; a rejeicao de um grupo com 21 nomes tambem foi conferida no navegador. O comando Compose local, incluindo seu volume persistente, ainda nao foi executado.

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

### Integracao continua

O workflow [Validate SplitGo](https://github.com/reisgabriel767-max/split-and-go/actions) repete os testes embarcados, os testes externos com container PostgreSQL 17, o build e o teste HTTP de producao. Ele executa em push e pull request com alteracoes de codigo, e pode ser iniciado manualmente. Alteracoes apenas no README ou em docs/ nao repetem a suite automaticamente. As actions oficiais estao fixadas por commit, com permissao de leitura do repositorio.

O esquema evolui por arquivos SQL ordenados em `db/`. A tabela `schema_migrations` registra os arquivos ja aplicados; a inicializacao aplica os pendentes em transacao, com bloqueio dessa tabela. `002_split_modes.sql` adiciona o modo e os percentuais, preservando despesas existentes como igualitarias. Para futuras alteracoes, adicione uma nova migracao; nao edite migracoes aplicadas. Reinicie a aplicacao depois de adicionar migracoes.

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

O campo `value` usa pontos-base no modo `percentage` (6000 = 60%) e centavos no modo `fixed`. As partes devem corresponder exatamente aos `memberIds`, sem faltantes, extras ou repeticoes. O modo `equal` usa apenas `{ "mode": "equal" }`. Omitir `split` mantem a compatibilidade com o fluxo inicial e assume divisao igualitaria. Os exemplos de identificadores acima sao ilustrativos; envie UUIDs reais do grupo.

Para cambio, envie `currency` com a moeda original e `exchangeRate` como texto decimal, por exemplo `"5.25"`. `amount` no pedido continua em centavos da moeda original: USD 10,01 usa `amount: 1001`; em um grupo BRL, a taxa 5,25 produz `amount: 5255` na resposta persistida, com `original_amount: 1001`. As partes fixas do pedido sempre usam centavos da moeda base. Omitir `currency` assume a moeda do grupo e taxa 1; despesas estrangeiras exigem cotacao explicita.

### Estrutura

- `src/app`: interface e endpoints Next.js.
- `src/components/workspace.tsx`: grupos, formularios, despesas e extratos.
- `src/lib/money.ts`: parse monetario e rateio em centavos.
- `src/lib/fx.ts`: conversao decimal, validacao de taxas e arredondamento.
- `src/lib/settlement.ts`: saldos e plano de acerto.
- `src/lib/db.ts`: conexao e transacoes com PGlite ou PostgreSQL.
- `db/001_initial.sql`: tabelas, chaves estrangeiras e restricoes.
- `tests`: testes de dominio e integracao dos endpoints com PostgreSQL embarcado.

As fotografias de capa sao carregadas do Unsplash; a funcionalidade dos grupos nao depende delas.

## Demonstracao

O roteiro em [docs/demo.md](docs/demo.md) organiza a apresentacao do produto e a explicacao das decisoes tecnicas. Antes de entregar, revise o acesso ao quadro e prepare a explicacao do codigo e o exercicio de logica ao vivo. O fluxo local com scripts esta validado; valide o container tambem caso essa seja a forma escolhida para a demonstracao.
