# Checklist de entrega

## Links

- Repositorio publico: https://github.com/reisgabriel767-max/split-and-go
- Quadro: https://github.com/users/reisgabriel767-max/projects/1 (atualmente privado).
- Demonstracao local: http://127.0.0.1:3000 enquanto o servidor estiver em execucao.
- Roteiro: [demo.md](demo.md).
- Evidencias de verificacao: [validation.md](validation.md).

## Pronto no repositorio

- [x] Grupos e participantes.
- [x] Rateios igualitario, percentual e por valor fixo.
- [x] Moeda original, cotacao e total convertido.
- [x] Saldos, extratos e plano de acerto com limites documentados.
- [x] Arquitetura, justificativas, casos de borda e propostas V2 no README.
- [x] Instrucoes de execucao local com scripts.
- [x] Testes no PostgreSQL embarcado e externo.
- [x] Build e verificacao HTTP da aplicacao compilada.
- [x] Quadro, issues e commits associados ao trabalho.

## Acoes antes de apresentar

- [ ] Disponibilizar o quadro para leitura dos avaliadores. A decisao atual e mante-lo privado.
- [ ] Ensaiar a demonstracao e conferir a execucao local no dia.
- [ ] Conseguir explicar o codigo, a arquitetura e as escolhas sem depender deste roteiro.
- [ ] Preparar-se para o exercicio de logica de 10 minutos ao vivo.

## Complementos

- [ ] Testar o container Docker, caso seja usado na demonstracao. O fluxo por scripts e PostgreSQL externo ja foi validado.
- [ ] Publicar uma demonstracao hospedada, entrega bonus prevista no case.

## Pontos para estudar

- Por que os valores sao centavos inteiros e os percentuais usam pontos-base.
- Onde a conversao arredonda e por que ela ocorre antes do rateio.
- Como a transacao evita gravar uma despesa sem todas as partes.
- Por que saldos devem somar zero e como o plano os quita.
- Como os subconjuntos de soma zero minimizam transferencias e por que a busca tem limite de tamanho.
- O que muda entre PostgreSQL embarcado, externo e o container ainda nao testado.
