# Validacao da entrega

Data da verificacao: 14/10/2026.

## Revalidacao de leitura concorrente

Apos a verificacao original abaixo, o GET passou a usar `REPEATABLE READ READ ONLY`. Isso mantem as quatro colecoes da resposta no mesmo snapshot. A escolha segue a [documentacao de isolamento do PostgreSQL](https://www.postgresql.org/docs/17/transaction-iso.html).

- `npm test`: 20 aprovados, um ignorado. O caso de duas conexoes exige PostgreSQL externo.
- `npm run test:postgres`: 21 aprovados, incluindo cadastro de membro e despesa entre a leitura de membros e a leitura de despesas.
- `npm run typecheck` e `npm run build`: aprovados.
- `npm run test:production`: aprovado com o novo build.
- PostgreSQL 18.4 em instancia temporaria exclusiva, vinculada a 127.0.0.1:55433, sem usar os dados da demonstracao. Nenhum esquema de testes restante e servidor encerrado apos a verificacao.
- Essa ampliacao ainda nao foi enviada para a CI. A execucao remota citada abaixo representa a suite anterior de 19 testes.

O build precisou executar fora do sandbox do Windows porque o Turbopack cria junctions. Os testes externos tambem precisaram de acesso a conexao local fora do sandbox. Essas restricoes nao exigiram alteracoes na configuracao do aplicativo.

## Ambiente observado

- Windows, Node.js 22.16.0 e Next.js 16.4.0.
- PostgreSQL embarcado: PGlite, conforme package-lock.json.
- PostgreSQL externo: 18.4 nativo, em instancia exclusiva de teste vinculada a 127.0.0.1:55432, com autenticacao por senha.
- Docker nao estava disponivel localmente. PostgreSQL 17-alpine foi executado e validado como servico Docker no GitHub Actions, usando a mesma imagem indicada no Compose.

## Resultados

| Verificacao | Resultado |
| --- | --- |
| `npm test` | 19 testes aprovados no PGlite |
| `npm run test:postgres` | Os mesmos 19 testes aprovados no PostgreSQL externo |
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado |
| `npm run test:production` | Fluxo HTTP aprovado com servidor compilado e PostgreSQL externo |
| GitHub Actions | Suite, build e teste HTTP aprovados com container PostgreSQL 17-alpine em Linux |
| Interface | Grupos, despesas, moedas, extratos e acertos conferidos em desktop e celular na etapa anterior |
| Limpeza | Nenhum esquema temporario de teste restante; instancia PostgreSQL de teste encerrada |

O teste HTTP de producao verificou pagina inicial, cadastro de grupo e participantes, tres formas de rateio, conversao de USD para BRL, leitura posterior dos registros e rejeicao de uma cotacao invalida sem criar despesa adicional.

A [execucao 38632541169](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38632541169) terminou com sucesso no commit `743dcd0`. O workflow inclui instalacao limpa com npm ci, os testes embarcados e externos, verificacao de tipos, build e teste HTTP de producao. Commits posteriores apenas de documentacao nao repetem essa suite automaticamente.

## Isolamento e repeticao

O helper tests/database-setup.ts atribui um esquema exclusivo a cada arquivo de integracao. Os testes de migracao alteram apenas seu esquema temporario. Os dados da demonstracao em .data/postgres nao sao usados pelos testes.

Os comandos de verificacao externa estao no README. A instancia usada nesta verificacao foi encerrada; para repetir, disponibilize novamente uma instancia PostgreSQL exclusiva de testes e informe sua URL. Nao e necessario instalar PostgreSQL nativo quando houver um banco de testes acessivel por rede.

## Limites que permanecem

- O container PostgreSQL 17 foi testado na CI. O comando Compose local, sua persistencia em volume e um deploy em hospedagem nao foram testados.
- A quantidade minima de transferencias e garantida para ate 20 participantes com saldo nao nulo. Para grupos maiores, a aplicacao identifica os planos cujo minimo nao foi comprovado como simplificados.
- Cotacoes sao manuais e preservadas por despesa. Nao ha consulta automatica de mercado.
- A demonstracao e local, sem contas de usuario, edicao ou exclusao de lancamentos e sem registro de pagamentos efetivos.
- O quadro esta privado por escolha do responsavel; seu acesso precisa ser resolvido antes da entrega aos avaliadores.
