# Validacao tecnica

Referencia: 16/10/2026. Resultados relativos aos cenarios executados, sem estimativa de cobertura percentual.

## Versao atual

| Verificacao | Resultado |
| --- | --- |
| npm test | 45 aprovados e um caso de concorrencia externa ignorado. |
| npm run test:postgres | 46 aprovados, nenhum ignorado, em PostgreSQL 18.4 isolado. |
| npm run typecheck | Aprovado. |
| npx tsc --noEmit --noUnusedLocals | Aprovado. |
| npm run build | Aprovado com Turbopack. |
| npm run test:production | Fluxo HTTP compilado aprovado com PostgreSQL externo. |
| GitHub Actions | [Execucao 38937774034](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034) aprovada no commit a0a8da0, com PostgreSQL 17-alpine. Evidencia da versao anterior, sem exclusao. |
| Iniciador Windows | SplitGo.exe --check confirmou pagina e API prontas em 127.0.0.1:3000. Essa verificacao nao inicia um servidor novo. |

O teste HTTP de producao cobre pagina inicial, criacao de grupo, tres formas de rateio, cambio de USD para BRL, preservacao da taxa historica e rejeicao de entrada invalida sem despesa adicional.

A ampliacao local de exclusao acrescenta oito testes: coordenacao transacional, remocao dos dados vinculados, preservacao de outro grupo, UUID e origem invalidos, repeticao idempotente, rollback depois da remocao, cliente HTTP, estado vazio e renderizacao da confirmacao. O smoke compilado tambem executa DELETE e verifica a preservacao de outro grupo. Nenhum grupo do banco demonstrativo foi excluido pelos testes.

Os quatro testes de renderizacao HTML verificam tabela, paineis, rateios, totais incompletos e campos de cambio. Eles nao exercitam cliques, teclado, layout ou comportamento visual em um navegador.

## Isolamento dos testes

O helper `tests/database-setup.ts` atribui um schema exclusivo a cada arquivo de integracao. Os testes embarcados utilizam memoria. Os testes de migracao alteram somente o schema temporario. O banco demonstrativo em `.data/postgres` nao participa dessas operacoes.

O PostgreSQL 18.4 de validacao usou 127.0.0.1:55433. Ao final, a consulta encontrou zero schemas temporarios restantes e o cluster de teste foi encerrado. Os comandos externos exigem SPLITGO_TEST_DATABASE_URL, sem fallback para o banco demonstrativo.

No Windows, o build Turbopack utiliza junctions internos do Next e depende de permissao para cria-los. Isso nao altera a configuracao ou as regras da aplicacao.

## Integridade e concorrencia

- `tests/repository.test.ts`: falha injetada no segundo INSERT de parte causa rollback da despesa e de todas as partes.
- `tests/snapshot.test.ts`: GET usa REPEATABLE READ READ ONLY e mantem as colecoes consistentes durante escrita concorrente.
- `tests/api.test.ts`: limite de membros, pertencimento, tres modalidades de rateio, conversao e preservacao de grupos legados.
- `tests/settlement.test.ts`: quitacao dos saldos, comparacao com oraculo exaustivo, caso adversarial ao guloso e limite de vinte saldos ativos.
- `tests/architecture.test.ts`: dominio e aplicacao sem imports de frameworks de apresentacao ou persistencia.

## Evidencias historicas

| Versao | Evidencia |
| --- | --- |
| Suite inicial de 19 testes | [CI 38632541169](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38632541169), commit 743dcd0. |
| Snapshot de leitura concorrente, 21 testes | [CI 38650341623](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38650341623), commit e6a5ace. |
| Limite de vinte participantes, 23 testes | [CI 38650831945](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38650831945), commit 2bba1df. |
| Separacao arquitetural, 34 testes | Validacao local em PGlite e PostgreSQL 18.4, tipos, build e fluxo HTTP. |
| Arquitetura e interface, 38 testes | [CI 38937774034](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034), commit a0a8da0. |

A interface anterior a modernizacao foi conferida em instancia isolada, incluindo grupo, rateios, cambio, extrato, integrante e acerto. A largura de 390px nao apresentou rolagem horizontal nessa versao. Essa evidencia nao valida o layout modernizado.

## Limites de verificacao

- Interface modernizada sem validacao visual/E2E nas larguras 1920, 1366, 768 e 390px.
- Docker Compose local e persistencia do volume nao testados; o container PostgreSQL foi validado na CI.
- Sem hospedagem publica, testes de carga ou avaliacao completa de seguranca de producao.
- Autenticacao, edicao e exclusao individual de lancamentos e registro de pagamentos nao fazem parte do MVP. Exclusao completa de grupos disponivel na versao local.
- Quadro de acompanhamento com leitura publica confirmada nas configuracoes do GitHub em 16/10/2026. Checklists das issues ainda exigem revisao.

As instrucoes para repetir os testes estao no [README](../README.md). Alteracoes apenas em README ou docs nao repetem a suite da CI automaticamente, conforme paths-ignore do workflow.
