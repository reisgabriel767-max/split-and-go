# Backlog inicial

Este arquivo prepara as tarefas para o quadro de acompanhamento. Ainda nao representa um quadro publicado no GitHub Projects.

## SETUP-01 - Preparar repositorio e quadro

- [x] Criar README, backlog e .gitignore.
- [ ] Publicar o repositorio no GitHub.
- [ ] Criar quadro com Backlog, In Progress, In Review, Testing e Done.
- [ ] Transferir as tarefas para issues e vincular ao quadro.

## ARCH-01 - Definir arquitetura

Criterios de aceite:
- Stack e banco escolhidos com justificativa.
- Diagrama de componentes e infraestrutura no README.
- Procedimento de execucao local documentado e validado.

## GROUP-01 - Gerenciar grupos e participantes

Criterios de aceite:
- Criar grupo com nome e moeda base.
- Adicionar participantes identificados por nome.
- Impedir participantes invalidos e grupos sem nome.

## EXPENSE-01 - Registrar e ratear despesas

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

Criterios de aceite:
- Exibir total pago, participacao nas despesas e saldo por participante.
- Garantir que a soma dos saldos do grupo seja zero.
- Sugerir transferencias que quitem todos os saldos.
- Documentar a estrategia de reducao de transferencias e seus limites.
- Verificar casos com saldo zero, centavos e varias moedas.

## PANEL-01 - Exibir extratos e fechamento

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
