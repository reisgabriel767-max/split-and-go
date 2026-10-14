# Treino para o exercicio de logica

Exercicios de preparacao, nao previsoes do desafio dos avaliadores. Fazer uma tentativa de 10 minutos por exercicio antes de consultar o gabarito.

## Como usar os 10 minutos

1. Minutos 0 a 2: repetir o problema com suas palavras, esclarecer entradas e escrever um exemplo.
2. Minutos 2 a 4: explicar a ideia e os invariantes.
3. Minutos 4 a 8: implementar a solucao mais simples que atende ao enunciado.
4. Minutos 8 a 10: executar exemplos, conferir bordas e explicar custo de tempo e memoria.

## Exercicio 1: rateio igualitario

Implementar `dividir(totalCentavos, quantidade)`. O total deve ser um inteiro seguro nao negativo e a quantidade deve ser um inteiro positivo. Retornar um vetor de inteiros com o mesmo tamanho da quantidade. As partes devem somar o total e diferir no maximo em um centavo. Atribuir os centavos extras aos primeiros indices.

Exemplos: `dividir(1000, 3)` resulta em `[334, 333, 333]`, `dividir(2, 4)` resulta em `[1, 1, 0, 0]` e `dividir(0, 2)` resulta em `[0, 0]`. Rejeitar total fracionario, total negativo, quantidade zero ou fracionaria.

Esta regra de desempate por indice e especifica do exercicio. O produto usa identificadores estaveis.

## Exercicio 2: saldos por participante

Implementar `calcularSaldos(ids, despesas)`. Cada despesa contem `pagadorId`, `totalCentavos` e `partes`, onde cada parte tem `membroId` e `centavos`. Assumir IDs de membros unicos. Rejeitar membros desconhecidos, valores invalidos, partes repetidas ou soma das partes diferente do total. O pagador pode nao aparecer nas partes.

Exemplo: Ana paga 1000, com partes Ana 500 e Bruno 500. Bruno paga 600, com partes Ana 300 e Bruno 300. O resultado deve ser Ana `+200` e Bruno `-200`.

Antes de implementar, explicar por que a soma dos saldos deve ser zero. Considerar lista vazia de despesas e uma pessoa pagando apenas para outra.

## Exercicio 3: detectar um par

Implementar `temParComSoma(valores, alvo)` para uma lista de inteiros seguros e um alvo inteiro seguro. Retornar se existem dois indices distintos cujos valores somam o alvo. Para este treino, assumir que subtracoes e somas intermediarias tambem permanecem no intervalo seguro.

Exemplos: `[3, 7, 2]`, alvo 10 resulta em `true`. `[5]`, alvo 10 resulta em `false`. `[5, 5]`, alvo 10 resulta em `true`. `[-2, 4, 8]`, alvo 6 resulta em `true`.

Explicar como tratar duplicatas sem usar o mesmo indice duas vezes.

## Gabarito para consultar depois

### Exercicio 1

```javascript
function dividir(totalCentavos, quantidade) {
  if (!Number.isSafeInteger(totalCentavos) || totalCentavos < 0) {
    throw new Error('Total invalido');
  }
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0) {
    throw new Error('Quantidade invalida');
  }
  const base = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos % quantidade;
  return Array.from({ length: quantidade }, (_, i) => base + (i < resto ? 1 : 0));
}
```

Tempo O(n), memoria O(n), onde n e a quantidade de pessoas. Em uma API real, impor um limite para n antes de alocar o vetor, como o limite de participantes do produto.

### Exercicio 2

Usar um Map com saldo inicial zero por membro. Para cada despesa, validar todos os dados antes de aplicar a alteracao. Somar o total ao pagador e subtrair cada parte do respectivo membro. Conferir que a soma das partes e exatamente o total. Usar um Set por despesa para detectar partes repetidas. Verificar tambem se as somas acumuladas continuam inteiros seguros.

Tempo O(m + d + p), memoria O(m + k), com m membros, d despesas, p partes totais e k o maior numero de partes numa despesa. Na aplicacao, uma transacao garante que a escrita da despesa e de suas partes seja atomica.

### Exercicio 3

```javascript
function temParComSoma(valores, alvo) {
  const vistos = new Set();
  for (const valor of valores) {
    if (vistos.has(alvo - valor)) return true;
    vistos.add(valor);
  }
  return false;
}
```

Tempo esperado O(n), memoria O(n). Consultar antes de adicionar impede reutilizar o mesmo indice. O segundo 5 encontra o primeiro 5. A versao com dois loops tem tempo O(n^2) e memoria adicional O(1), e tambem e uma resposta correta quando o tamanho da entrada permite.
