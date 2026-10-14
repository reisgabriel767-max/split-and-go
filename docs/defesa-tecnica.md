# Ensaio da defesa tecnica

Este roteiro complementa demo.md. Ajuste a duracao ao tempo combinado com os avaliadores. Os tempos abaixo sao uma sugestao, nao uma exigencia do case.

## Sequencia sugerida

1. Contexto (30 segundos): Split&Go organiza despesas de grupos e calcula quem deve pagar quem.
2. Demonstracao (3 minutos): criar grupo, registrar os tres rateios, converter uma despesa, recarregar e mostrar extrato e acerto. Usar os exemplos de demo.md.
3. Arquitetura (1 minuto): interface React, API Next.js, validacao Zod, regras em modulos independentes e persistencia SQL transacional.
4. Precisao (1 minuto): centavos inteiros, percentuais em pontos-base, maiores restos e conversao antes do rateio.
5. Acerto (1 minuto): saldo igual a pago menos devido, soma dos saldos zero, subconjuntos de soma zero e limite de 20 saldos ativos.
6. Qualidade e processo (1 minuto): abrir o workflow aprovado, uma issue e um commit relacionado. Explicar um teste concreto.
7. Limites e V2 (30 segundos): sem autenticacao e pagamentos efetivos, cambio manual, deploy ainda ausente. Priorizar acesso seguro e registro de quitacoes.

## Perguntas para responder sem ler

- Por que 10,00 dividido por tres nao pode simplesmente arredondar cada parte? Porque isso pode perder ou criar centavos. O algoritmo distribui o resto e conserva o total.
- Por que converter antes de dividir? Para arredondar o total apenas uma vez e distribuir exatamente esse total entre as partes.
- Quem pode pagar uma despesa? Um membro do grupo, mesmo quando nao participa do rateio.
- Como impedir dados incompletos? Validar no servidor e gravar despesa e partes na mesma transacao. As chaves estrangeiras compostas reforcam o pertencimento ao grupo.
- Por que o algoritmo guloso nem sempre basta? Ele quita saldos, mas pode produzir mais transferencias que uma particao exata em subconjuntos de soma zero.
- Por que limitar a busca exata? Seu custo cresce como O(n * 2^n), com memoria O(2^n). Acima de 20 saldos nao nulos, o sistema usa uma simplificacao e identifica quando nao comprovou o minimo.
- Como os testes evitam alterar a demonstracao? Cada arquivo de integracao usa um esquema exclusivo no banco externo. Os testes embarcados usam banco de teste isolado.
- O que foi validado com Docker? O servico PostgreSQL 17-alpine no GitHub Actions. O Compose e seu volume local ainda nao foram executados neste ambiente.

## Antes de gravar ou apresentar

- Conferir o servidor e abrir a demonstracao local.
- Usar dados claramente identificados como exemplos.
- Conferir o acesso dos avaliadores ao quadro, que continua privado por sua escolha.
- Abrir previamente o README, o workflow aprovado e os modulos money.ts, fx.ts e settlement.ts.
- Praticar o exercicio de logica ao vivo separadamente. Explicar a ideia e os casos de borda antes de escrever.

Evidencias e limites atualizados: validation.md. Nao afirmar que houve deploy, autenticacao ou pagamento real.
