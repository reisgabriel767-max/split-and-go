# Validacao da entrega

## Modernizacao visual e fechamento - 16/10/2026

Estado atual: 37 testes aprovados no PGlite e um externo ignorado; 38 aprovados no PostgreSQL 18.4 isolado, nenhum ignorado. Typecheck, verificacao de imports nao utilizados, build e teste HTTP de producao aprovados. Quatro testes adicionais cobrem a renderizacao estatica da tabela, quatro paineis, tres rateios e campos de cambio.

Nenhum schema temporario restante; cluster de teste encerrado. O iniciador `SplitGo.exe --check` confirmou pagina e API prontas em 127.0.0.1:3000, sem criar dados. O build exigiu permissao para junctions do Turbopack no Windows.

A interface modernizada ainda nao foi validada visualmente: a ferramenta de navegador foi bloqueada. Permanecem pendentes as larguras 1920, 1366, 768 e 390px e a interacao real dos controles. Os testes HTML estaticos e HTTP nao substituem testes visuais/E2E. O relato visual na secao arquitetural abaixo corresponde a interface anterior, nao a modernizacao.

Publicacao autorizada e realizada em 16/10/2026. A [CI 38937774034](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034) terminou com sucesso no commit a0a8da0, incluindo testes embarcados e externos com PostgreSQL 17, tipos, build e smoke HTTP. Consultar [delivery.md](delivery.md) e [ui-modernization.md](ui-modernization.md) para arquivos alterados e limitacoes desta etapa.

## Refatoracao arquitetural local - 16/10/2026

Referencia antes de editar: 22 testes aprovados e um caso externo ignorado, typecheck e build aprovados. Depois da separacao de aplicacao, infraestrutura e apresentacao: 33 testes aprovados no PGlite e um externo ignorado; todos os 34 aprovados no PostgreSQL 18.4 exclusivo de validacao. Typecheck, build e smoke HTTP da aplicacao compilada aprovados.

A interface foi conferida pelo navegador em uma instancia compilada isolada: criacao de grupo, tres rateios, cambio, recarga, extrato, inclusao de membro e plano de acerto. O viewport de 390 pixels nao apresentou rolagem horizontal. Os esquemas temporarios foram removidos e os processos de validacao encerrados. Nenhum lancamento foi criado ou alterado no banco demonstrativo.

O relatorio [architecture.md](architecture.md) detalha os arquivos, principios aplicados, testes e riscos remanescentes. Os algoritmos financeiros, SQL de migracoes, CSS e iniciador C# foram preservados. Esta versao esta apenas no checkout local, sem commit, push ou nova execucao da CI remota. Os resultados abaixo sao historicos de versoes anteriores.

Data da verificacao: 14/10/2026.

## Revalidacao de leitura concorrente

Apos a verificacao original abaixo, o GET passou a usar `REPEATABLE READ READ ONLY`. Isso mantem as quatro colecoes da resposta no mesmo snapshot. A escolha segue a [documentacao de isolamento do PostgreSQL](https://www.postgresql.org/docs/17/transaction-iso.html).

- `npm test`: 20 aprovados, um ignorado. O caso de duas conexoes exige PostgreSQL externo.
- `npm run test:postgres`: 21 aprovados, incluindo cadastro de membro e despesa entre a leitura de membros e a leitura de despesas.
- `npm run typecheck` e `npm run build`: aprovados.
- `npm run test:production`: aprovado com o novo build.
- PostgreSQL 18.4 em instancia temporaria exclusiva, vinculada a 127.0.0.1:55433, sem usar os dados da demonstracao. Nenhum esquema de testes restante e servidor encerrado apos a verificacao.
- A ampliacao foi enviada e passou na [execucao 38650341623](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38650341623), commit e6a5ace: testes embarcados e externos, tipos, build e fluxo HTTP compilado aprovados. A execucao antiga citada abaixo representa a suite original de 19 testes.

## Limite do MVP

Por decisao do responsavel, novos grupos e inclusoes posteriores ficam limitados a 20 participantes. Grupos legados maiores conservam consulta e suporte a despesas, sem novos membros. Os testes verificam criacao acima do limite, inclusao do vigesimo membro, rejeicao do vigesimo primeiro e preservacao de um grupo legado com 21 membros.

- Suite ampliada: 22 testes aprovados no PGlite, um caso de concorrencia ignorado por exigir PostgreSQL externo.
- Build com verificacao de tipos aprovado.
- Navegador: cadastro com 21 nomes rejeitado sem criar grupo. Dados demonstrativos anteriores preservados.
- CI desta ampliacao aprovada: [execucao 38650831945](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38650831945), commit 2bba1df. Os 23 testes passaram no PostgreSQL 17-alpine, incluindo inclusoes simultaneas no ultimo espaco disponivel. Tipos, build e fluxo HTTP da aplicacao compilada tambem aprovados.

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
