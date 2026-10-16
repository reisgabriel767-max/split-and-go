# Modernizacao da interface - 16/10/2026

## Escopo

Alteracao de apresentacao, sem novas dependencias. Preservados endpoints,
contratos, hook de casos de uso, calculos monetarios, regras de rateio,
minimizacao, persistencia, migracoes e executavel Windows. As alteracoes
locais anteriores de arquitetura permanecem intactas. Nenhum commit ou push.

## Arquivos desta etapa

- `src/app/globals.css`: escala tipografica legivel, stack Inter/Segoe UI,
  sidebar de 220px, conteudo util de ate 1200px, banner discreto, indicadores
  independentes, tabela responsiva, formularios e plano de acerto. Verde
  #107C61 preservado. Valores tabulares, foco visivel, transicoes de 160ms
  e respeito a prefers-reduced-motion.
- `src/components/workspace.tsx`: indicadores fora do enquadramento do grupo,
  acao funcional Ver plano de acerto, navegacao das abas por setas/Home/End,
  foco unico da aba ativa, identificacao do grupo selecionado e bloqueio
  dos campos durante envio. Dialogo nativo preservado.
- `src/components/expense-list.tsx`: tabela extraida com cabecalhos semanticos,
  descricao, data, pagador, rateio e valor. No celular, metadados acompanham
  a descricao; moeda original e cotacao historica continuam disponiveis.
- `src/components/group-panels.tsx`: usa a tabela extraida e distingue saldo
  zerado (neutro), a receber (verde) e a pagar (laranja), com texto e icones.
- `src/components/settlement-panel.tsx`: identificacao explicita de devedor
  e credor, preservando quantidade, selo de otimalidade e valores.
- `tests/ui-rendering.test.ts`: quatro testes de renderizacao HTML estatica
  para tabela, quatro paineis, tres rateios, totais incompletos e cambio.

ExpenseSplit e CurrencyFields mantiveram seus contratos e calculos; a
modernizacao desses controles foi feita no CSS compartilhado.

## Validacao executada

- `npm run typecheck`: aprovado.
- `npm test`: 37 aprovados, um teste de concorrencia externa ignorado.
- `npm run test:postgres`: 38 aprovados, nenhum ignorado.
- `npm run build`: aprovado com Turbopack. Exige permissao fora do sandbox
  neste Windows para criar junctions internos do Next.
- `npm run test:production`: aprovado em schema temporario isolado; pagina,
  grupos, tres rateios, cambio historico, persistencia e entradas invalidas.
- `git diff --check`: aprovado; apenas avisos de conversao LF/CRLF.

Os testes de banco criam e removem schemas temporarios. Nao foram criados
grupos ou despesas no banco pessoal para validar esta etapa.

## Validacao visual pendente

A tentativa de acessar o aplicativo pela ferramenta de navegador foi
bloqueada pela politica do ambiente. Nao foram capturadas telas, medidos
overflows ou exercitados cliques/teclado em navegador nesta etapa.
Os testes de renderizacao estatica nao substituem testes visuais nem E2E.

O CSS contempla desktop, tablet e celular, mas ainda requer conferencia
visual em 1920, 1366, 768 e 390px, incluindo nomes/valores longos, as quatro
abas, os tres modais, navegacao por teclado e os tres modos de rateio.
As imagens contextuais existentes continuam dependendo de acesso ao Unsplash;
a fonte Inter so e usada quando instalada, com fallback local sem download.
