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
- `route.ts`: valida dados e pertencimento ao grupo; grava despesa e partes em uma transacao.
- `settlement.ts`: saldo e total pago menos total devido; o plano exato maximiza subconjuntos de soma zero para reduzir transferencias.
- Limite do algoritmo: minimo global garantido ate 20 saldos ativos; grupos maiores usam simplificacao, sem promessa de minimo quando ele nao foi comprovado.
- Persistencia: PostgreSQL embarcado em desenvolvimento sem Docker, PostgreSQL externo quando DATABASE_URL esta definida. Migracoes SQL preservam os dados existentes.
- Cotacoes sao manuais neste MVP, sem feed de cambio. O historico nao e recalculado por taxas novas.

## Processo e validacao

- Abrir o quadro e as issues relacionadas aos commits.
- Mostrar `git log --oneline` e explicar uma alteracao concreta em cada entrega.
- Executar `npm test`, `npm run typecheck` e `npm run build`.
- Antes da entrega, executar o fluxo com PostgreSQL via Docker em uma maquina que tenha Docker instalado.
- Disponibilizar acesso de leitura ao quadro aos avaliadores; ele esta privado por escolha do responsavel.
- Reservar preparacao para o exercicio de logica de 10 minutos. Explicar os invariantes e os casos de borda do proprio codigo.
