# Split&Go

MVP para organizar despesas de grupos, calcular saldos individuais e sugerir um plano de acerto entre participantes.

## Status

Projeto em planejamento. A aplicacao ainda nao foi implementada e a stack sera definida antes do desenvolvimento.

## Escopo inicial

- Cadastro de grupos e participantes.
- Registro de despesas com um pagador e varios participantes.
- Rateio igualitario, por percentual ou por valor fixo.
- Registro de moedas e conversao para a moeda base do grupo.
- Extrato individual e calculo dos saldos.
- Plano de acerto com reducao de transferencias.

## Organizacao

O backlog inicial esta em [docs/backlog.md](docs/backlog.md). O quadro de acompanhamento no GitHub Projects sera configurado com as colunas Backlog, In Progress, In Review, Testing e Done.

Os commits devem ser pequenos e descrever mudancas reais, seguindo Conventional Commits, por exemplo: `feat: add group creation` ou `fix: preserve cents when splitting expenses`.

## Documentacao prevista

- Instrucoes para executar localmente.
- Diagrama da arquitetura e infraestrutura.
- Justificativa da stack e do banco de dados.
- Regras de moedas, arredondamento e casos de borda.
- Propostas de evolucao do produto.

Essas secoes serao preenchidas conforme as decisoes e a implementacao avancarem.
