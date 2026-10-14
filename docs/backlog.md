# Backlog inicial

As tarefas estao publicadas como [issues](https://github.com/reisgabriel767-max/split-and-go/issues) e vinculadas ao [quadro Split&Go - MVP](https://github.com/users/reisgabriel767-max/projects/1), atualmente privado por decisao do responsavel. O acesso aos avaliadores permanece pendente para a entrega.

| Tarefa | Issue |
| --- | --- |
| SETUP-01 | [#8](https://github.com/reisgabriel767-max/split-and-go/issues/8) |
| ARCH-01 | [#1](https://github.com/reisgabriel767-max/split-and-go/issues/1) |
| GROUP-01 | [#2](https://github.com/reisgabriel767-max/split-and-go/issues/2) |
| EXPENSE-01 | [#3](https://github.com/reisgabriel767-max/split-and-go/issues/3) |
| FX-01 | [#4](https://github.com/reisgabriel767-max/split-and-go/issues/4) |
| BALANCE-01 | [#5](https://github.com/reisgabriel767-max/split-and-go/issues/5) |
| PANEL-01 | [#6](https://github.com/reisgabriel767-max/split-and-go/issues/6) |
| DELIVERY-01 | [#7](https://github.com/reisgabriel767-max/split-and-go/issues/7) |

## SETUP-01 - Preparar repositorio e quadro

- [x] Criar README, backlog e .gitignore.
- [x] Publicar o repositorio no GitHub.
- [x] Criar quadro com Backlog, In Progress, In Review, Testing e Done.
- [x] Transferir as tarefas para issues e vincular ao quadro.
- [ ] Disponibilizar acesso de leitura ao quadro para os avaliadores antes da entrega.

## ARCH-01 - Definir arquitetura

Andamento: base implementada e validada com PostgreSQL embarcado. A conexao ao PostgreSQL externo do Docker Compose permanece pendente de teste.

Criterios de aceite:
- Stack e banco escolhidos com justificativa.
- Diagrama de componentes e infraestrutura no README.
- Procedimento de execucao local documentado e validado.

## GROUP-01 - Gerenciar grupos e participantes

Concluido no primeiro fluxo: criacao de grupo e participantes, inclusao posterior de participante e rejeicao de nomes duplicados. Validado por testes de API e navegador.

Criterios de aceite:
- Criar grupo com nome e moeda base.
- Adicionar participantes identificados por nome.
- Impedir participantes invalidos e grupos sem nome.

## EXPENSE-01 - Registrar e ratear despesas

Concluido: rateios igualitario, percentual e por valor fixo implementados. Totais, pertencimento ao grupo, centavos e historico sao validados no servidor e nos testes; os tres modos foram conferidos no navegador. Migracao preserva despesas antigas como igualitarias.

Criterios de aceite:
- Informar descricao, valor, moeda, pagador e participantes.
- Oferecer rateio igualitario, por percentual e por valor fixo.
- Validar que as partes correspondem ao total da despesa.
- Preservar o total ao distribuir centavos restantes.

## FX-01 - Definir conversao de moedas

Criterios de aceite:
- Registrar a taxa usada em cada despesa estrangeira.
- Manter o valor original e o valor convertido.
- Rejeitar taxas nulas, negativas ou ausentes quando necessarias.

## BALANCE-01 - Calcular saldos e plano de acerto

Andamento: saldos individuais calculados a partir dos pagamentos e partes persistidos. O plano otimizado de acerto ainda nao foi implementado.

Criterios de aceite:
- Exibir total pago, participacao nas despesas e saldo por participante.
- Garantir que a soma dos saldos do grupo seja zero.
- Sugerir transferencias que quitem todos os saldos.
- Documentar a estrategia de reducao de transferencias e seus limites.
- Atender ao requisito de minimizacao: avaliar busca exata para grupos pequenos e limites de complexidade antes de concluir a tarefa.
- Verificar casos com saldo zero, centavos e varias moedas.

## PANEL-01 - Exibir extratos e fechamento

Andamento: despesas, participantes, saldos e extratos individuais implementados, com layout verificado em desktop e celular. Falta o plano de acerto.

Criterios de aceite:
- Exibir despesas e extrato de cada participante.
- Distinguir valores a pagar e a receber.
- Exibir o plano de acerto e um estado vazio compreensivel.

## DELIVERY-01 - Preparar entrega

Criterios de aceite:
- Documentar pelo menos tres casos de borda.
- Propor tres melhorias de negocio ou duas funcionalidades para V2.
- Validar a execucao local a partir das instrucoes.
- Preparar demonstracao do produto, arquitetura, quadro e commits.
- Avaliar deploy como entrega adicional.
