# Roteiro de gravacao

Sugestao de ensaio de 8 a 10 minutos. O tempo do video deve seguir o combinado com os avaliadores; este roteiro nao estabelece uma exigencia do case.

## Preparacao

1. Fechar abas, notificacoes e qualquer tela com senhas, tokens, codigos de autenticacao ou dados pessoais.
2. Conferir a aplicacao em http://127.0.0.1:3000. Se nao estiver ativa, executar `npm run dev` na pasta do projeto e usar a porta informada no terminal.
3. Deixar abertos README, src/lib/money.ts, src/lib/fx.ts e src/lib/settlement.ts.
4. Abrir a [execucao aprovada da CI](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38632541169) e o [historico de commits](https://github.com/reisgabriel767-max/split-and-go/commits/main/).
5. Verificar o microfone e gravar um teste curto de som e legibilidade da tela. Nao mostrar arquivos .env nem URLs com credenciais.

O quadro continua privado. Mostrar o quadro em um video nao substitui disponibilizar seu acesso aos avaliadores. Nao alterar sua visibilidade sem uma decisao do responsavel.

## Demonstracao reproduzivel

Criar um grupo novo chamado `Ensaio SplitGo`, em BRL, com Ana, Bruno e Carla. Isso evita depender dos dados de exemplo que ja existem. Estes lancamentos sao ficticios e nao representam pagamentos efetivos.

| Ordem | Descricao | Pagador | Valor | Rateio entre Ana, Bruno e Carla |
| --- | --- | --- | --- | --- |
| 1 | Lanche | Ana | BRL 10,00 | Igualitario para os tres |
| 2 | Passeio | Bruno | BRL 10,00 | 50%, 25%, 25% |
| 3 | Transporte | Carla | BRL 10,00 | Fixos: 2,00, 3,00, 5,00 |
| 4 | Reserva | Ana | USD 10,01 | Igualitario para os tres, taxa 5,25 BRL/USD |

No primeiro rateio, mostrar duas partes de R$ 3,33 e uma de R$ 3,34. A pessoa que recebe o centavo adicional depende do desempate estavel por identificador, nao da ordem visual dos nomes.

Antes de salvar Passeio, tentar 50%, 25%, 24,99%. Mostrar a rejeicao e corrigir para 100%. Em Transporte, tentar 2,00, 3,00, 4,99 antes de corrigir a ultima parte para 5,00.

Na Reserva, conferir USD 10,01, taxa 5,25 e conversao de R$ 52,55. A soma das quatro despesas deve ser R$ 82,55. Recarregar e conferir o historico. Abrir o extrato de Ana e depois Acerto. Explicar os valores exibidos, sem decorar quem recebe os centavos de desempate.

## Sequencia de fala e tela

| Tempo sugerido | Tela | Conteudo |
| --- | --- | --- |
| 0:00 a 0:30 | Aplicacao | Problema das despesas compartilhadas e objetivo do MVP |
| 0:30 a 3:30 | Grupo novo | Fluxo acima, validacoes e persistencia apos recarregar |
| 3:30 a 4:30 | README e API | Arquitetura, validacao no servidor e transacao SQL |
| 4:30 a 5:30 | money.ts e fx.ts | Centavos, maiores restos e conversao antes do rateio |
| 5:30 a 6:30 | settlement.ts e Acerto | Saldo pago menos devido, soma zero e limite da busca exata |
| 6:30 a 7:30 | CI e historico | Um teste concreto, um commit relacionado a issue e resultado da CI |
| 7:30 a 8:30 | Aplicacao ou slides | Limites atuais e prioridades propostas para V2 |

Os tempos sao referencias de ensaio. Uma demonstracao clara pode levar mais tempo. Evitar acelerar a fala para cumprir a tabela.

## Afirmacoes que precisam permanecer precisas

- O minimo global de transferencias tem garantia para ate 20 saldos nao nulos. Acima disso, o plano e simplificado quando nao ha comprovacao de minimo.
- As cotacoes sao manuais e salvas por despesa. Nao existe feed automatico de cambio.
- A CI aprovou PostgreSQL 17-alpine em container. O Compose e seu volume local ainda nao foram testados.
- Os testes HTTP usaram a aplicacao compilada. Isso nao significa que existe um deploy hospedado.
- Nao ha autenticacao, edicao/exclusao de lancamentos nem registro de quitacoes efetivas neste MVP.

## Revisao antes de entregar

- Ouvir o video inteiro e conferir se o codigo esta legivel.
- Remover trechos com informacoes sensiveis caso aparecam acidentalmente.
- Conferir se o link do video funciona para o destinatario, segundo a forma de entrega combinada.
- Conferir os links do repositorio e o acesso de leitura ao quadro.
- Nao considerar a gravacao concluida apenas porque este roteiro existe. A gravacao e o envio continuam pendentes.
