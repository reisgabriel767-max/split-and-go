# Checklist de entrega

## Fechamento atual - 16/10/2026

- Implementacao funcional e modernizacao visual concluidas no checkout.
- Validacao local: 38 testes externos aprovados, tipos, build e smoke HTTP de producao aprovados. Suite embarcada: 37 aprovados e um externo ignorado.
- Arquitetura, interface e documentacao publicadas em main, com autorizacao do responsavel: commits 5d14e49, a0d5c6f e a0a8da0.
- CI atual aprovada no commit a0a8da0: [execucao 38937774034](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034). Inclui instalacao limpa, testes embarcados, PostgreSQL 17 em container, tipos, build e fluxo HTTP de producao. Atualizacoes posteriores apenas documentais nao mudam o codigo validado.
- Conferencia visual da interface modernizada pendente em 1920, 1366, 768 e 390px: a ferramenta de navegador foi bloqueada. Testes de renderizacao estatica nao validam layout ou interacao real.
- Quadro permanece privado por decisao do responsavel: requisito publico do case nao atendido.
- Deploy bonus dispensado. Demonstracao sera local; nao ha URL publica da aplicacao.
- Executavel e relatorios TXT completos permanecem como complementos locais; nao sao necessarios para executar o repositorio com npm.

Links atuais para os avaliadores: [repositorio](https://github.com/reisgabriel767-max/split-and-go), [README](https://github.com/reisgabriel767-max/split-and-go/blob/main/README.md), [arquitetura](https://github.com/reisgabriel767-max/split-and-go/blob/main/docs/architecture.md) e [CI atual](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034). Os slides antigos podem apoiar o ensaio, mas suas contagens de testes e descricao visual nao representam a versao atual; usar os documentos atuais como referencia tecnica.

Os relatorios [architecture.md](architecture.md) e [ui-modernization.md](ui-modernization.md) registram as etapas. Os links historicos de CI e os slides abaixo representam a entrega anterior, de 23 testes, e nao comprovam as alteracoes atuais.

## Links

- Repositorio publico: https://github.com/reisgabriel767-max/split-and-go
- Quadro: https://github.com/users/reisgabriel767-max/projects/1 (atualmente privado).
- Demonstracao local: http://127.0.0.1:3000 enquanto o servidor estiver em execucao.
- Roteiro: [demo.md](demo.md).
- Defesa tecnica: [defesa-tecnica.md](defesa-tecnica.md).
- Slides editaveis: [apresentacao.pptx](apresentacao.pptx).
- Gravacao: [gravacao.md](gravacao.md).
- Treino de logica: [treino-logica.md](treino-logica.md).
- Evidencias de verificacao: [validation.md](validation.md).

## Funcionalidades e materiais

- [x] Grupos e participantes.
- [x] Rateios igualitario, percentual e por valor fixo.
- [x] Moeda original, cotacao e total convertido.
- [x] Saldos, extratos e plano de acerto com limites documentados.
- [x] Arquitetura, justificativas, casos de borda e propostas V2 no README.
- [x] Instrucoes de execucao local com scripts.
- [x] Testes no PostgreSQL embarcado e externo.
- [x] Build e verificacao HTTP da aplicacao compilada.
- [x] Integracao continua aprovada com container PostgreSQL 17 no GitHub Actions.
- [x] Quadro, issues e commits associados ao trabalho.
- [x] Slides editaveis e roteiros de demonstracao, defesa e treino de logica.

## Acoes antes de apresentar

- [ ] Tornar o quadro publico conforme o case. A decisao atual e mante-lo privado, portanto este requisito ainda nao esta atendido.
- [ ] Ensaiar a demonstracao e conferir a execucao local no dia.
- [ ] Conseguir explicar o codigo, a arquitetura e as escolhas sem depender deste roteiro.
- [ ] Preparar-se para o exercicio de logica de 10 minutos ao vivo.

## Fechamento tecnico

- [x] Publicar a correcao de concorrencia e os materiais de preparacao no GitHub.
- [x] Confirmar a CI dessa versao: [execucao 38650341623](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38650341623), commit e6a5ace.
- [x] Limitar criacao e ampliacao de grupos a 20 participantes, por decisao do responsavel. Dados legados maiores permanecem acessiveis.
- [x] Publicar e confirmar a CI da mudanca de limite: [execucao 38650831945](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38650831945), commit 2bba1df. Os 23 testes externos, tipos, build e teste HTTP passaram.

O documento solicita apresentacao em videochamada, nao um video gravado para entrega. gravacao.md e um recurso opcional de ensaio. O preparo dos materiais nao substitui a apresentacao pessoal nem o exercicio ao vivo.

## Conferencia historica - 14/10/2026

Conferido em 14/10/2026: repositorio publico, branch main sincronizada, CI do ultimo codigo aprovada e demonstracao local respondendo HTTP 200. Os dados demonstrativos preservados contem um grupo, quatro membros, quatro despesas e treze partes, com total de R$ 172,57.

Os slides em apresentacao.pptx refletem os 23 testes e o limite aprovado de 20 participantes. Antes da videochamada, abrir os links abaixo e conferir novamente o servidor, o microfone e o compartilhamento de tela.

Links para fornecer aos avaliadores:

- Codigo e instrucoes: https://github.com/reisgabriel767-max/split-and-go
- Slides: https://github.com/reisgabriel767-max/split-and-go/blob/main/docs/apresentacao.pptx
- Evidencia da CI: https://github.com/reisgabriel767-max/split-and-go/actions/runs/38650831945
- Quadro: https://github.com/users/reisgabriel767-max/projects/1 (privado por decisao reafirmada do responsavel; nao atende ao requisito publico).

Nao ha link hospedado da aplicacao. O endereco 127.0.0.1 funciona apenas no computador que executa o servidor. Nenhuma mensagem ou entrega foi enviada ao recrutamento.

## Complementos

- [ ] Executar o Compose local e conferir seu volume, caso essa seja a forma escolhida para a demonstracao. O container PostgreSQL 17 ja foi validado na CI.
- Deploy hospedado: bonus dispensado por decisao do responsavel. A entrega usara demonstracao local na videochamada; nao ha link publico da aplicacao.

## Pontos para estudar

- Por que os valores sao centavos inteiros e os percentuais usam pontos-base.
- Onde a conversao arredonda e por que ela ocorre antes do rateio.
- Como a transacao evita gravar uma despesa sem todas as partes.
- Por que saldos devem somar zero e como o plano os quita.
- Como os subconjuntos de soma zero minimizam transferencias e por que a busca tem limite de tamanho.
- O que muda entre PostgreSQL embarcado, externo e o container validado na CI. O Compose local ainda precisa de verificacao se for usado na demonstracao.
