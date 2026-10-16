# Roteiro de demonstracao

## Produto

1. Abrir a aplicacao e criar um grupo em BRL com tres participantes.
2. Registrar R$ 100,00 pagos por uma pessoa, com divisao igualitaria. Mostrar que os centavos fecham o total.
3. Registrar uma despesa percentual. Tentar 99,99% e mostrar a rejeicao; corrigir para 100%.
4. Registrar uma despesa por valores fixos. Mostrar a diferenca antes de fechar o total.
5. Registrar USD 10,01 com cotacao 5,25 BRL/USD. O total convertido deve ser R$ 52,55; as partes sao calculadas sobre esse total.
6. Recarregar e mostrar que valor original e cotacao continuam registrados. Consultar o extrato de um participante.
7. Abrir Acerto. Explicar quem paga quem, a quantidade de transferencias e o selo de minimo verificado ou plano simplificado.

Os exemplos da pasta local sao dados demonstrativos; nao representam pagamentos realizados.

## Explicacao tecnica

- `money.ts`: valores inteiros em centavos, percentuais em pontos-base e maiores restos.
- `fx.ts`: Decimal.js multiplica o valor original pela taxa e arredonda half-up uma vez.
- `route.ts` e `presentation/groups-http.ts`: validam o contrato HTTP e traduzem respostas/erros. `application/groups.ts` coordena pertencimento, conversao e rateio. `infrastructure/sql-group-repository.ts` grava despesa e partes na mesma transacao.
- `settlement.ts`: saldo e total pago menos total devido; o plano exato maximiza subconjuntos de soma zero para reduzir transferencias.
- Escopo do MVP: novos grupos tem no maximo 20 membros, dentro da garantia de minimo global. Grupos legados maiores continuam acessiveis e podem usar simplificacao, sem promessa de minimo quando ele nao foi comprovado.
- Persistencia: PostgreSQL embarcado em desenvolvimento sem Docker, PostgreSQL externo quando DATABASE_URL esta definida. Migracoes SQL preservam os dados existentes.
- Cotacoes sao manuais neste MVP, sem feed de cambio. O historico nao e recalculado por taxas novas.

## Processo e validacao

- Abrir o quadro e as issues relacionadas aos commits.
- Mostrar `git log --oneline` e explicar uma alteracao concreta em cada entrega.
- Executar `npm test`, `npm run typecheck` e `npm run build`.
- A suite foi validada com PostgreSQL 18.4 nativo e container PostgreSQL 17 na CI, incluindo a aplicacao compilada. Para repetir, usar `SPLITGO_TEST_DATABASE_URL`, `npm run test:postgres` e `npm run test:production` apos o build. Conferir o Compose local tambem se essa for a forma escolhida para a demonstracao.
- Disponibilizar acesso de leitura ao quadro aos avaliadores; ele esta privado por escolha do responsavel.
- Reservar preparacao para o exercicio de logica de 10 minutos. Explicar os invariantes e os casos de borda do proprio codigo.
