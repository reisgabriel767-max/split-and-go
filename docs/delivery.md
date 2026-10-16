# Estado da entrega

Referencia: 16/10/2026.

## Implementacao

- Grupos e integrantes, com limite de 20 participantes para novos grupos.
- Exclusao permanente de grupo e dados vinculados, com confirmacao pelo nome.
- Despesas com um pagador e multiplos participantes.
- Rateios igualitario, percentual e por valores fixos.
- BRL, USD e EUR com cotacao manual e historico persistido.
- Saldos individuais, extratos e plano de acerto.
- Arquitetura modular, testes automatizados e integracao continua.
- Demonstracao local, sem autenticacao nem pagamentos efetivos.

Os commits 5d14e49, a0d5c6f e a0a8da0 registram arquitetura, interface e documentacao. A [CI 38937774034](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034) passou no commit a0a8da0, com instalacao limpa, testes PGlite e PostgreSQL 17, tipos, build e teste HTTP de producao.

A exclusao amplia a versao validada pela CI historica. A validacao local passou em 46 testes externos, tipos, build e HTTP de producao, incluindo exclusao e preservacao de outros grupos. A CI de 38 testes representa a versao sem essa ampliacao. O resultado da CI desta revisao deve ser consultado no GitHub Actions. Os slides distinguem os resultados locais da evidencia historica.

## Materiais

- [Arquitetura](architecture.md)
- [Validacao](validation.md)
- [Backlog](backlog.md)
- [Slides editaveis](apresentacao-final.pptx), seis slides em formato 16:9
- [Matriz de aderencia ao case](checklist-apresentacao.md)

O PPTX contem seis slides atualizados. A captura do produto utilizada nos slides e de 14/10/2026, anterior a modernizacao visual e identificada como historica.

O executavel Windows e os relatorios TXT sao complementos locais. A execucao do repositorio utiliza Node.js e os scripts npm, sem depender desses arquivos.

## Verificacoes pendentes

| Item | Estado |
| --- | --- |
| Acesso publico ao quadro | Confirmado em 16/10/2026 nas configuracoes do GitHub. Leitura publica, edicao restrita. |
| Checklists das issues | Desatualizados em relacao ao estado da implementacao. |
| Interface modernizada | Validacao visual e de interacao pendente em 1920, 1366, 768 e 390px. |
| Docker Compose local | Execucao e persistencia do volume nao verificadas. PostgreSQL 17 em container foi validado na CI. |
| Apresentacao em videochamada | Materiais disponiveis; demonstracao e exercicio de logica ao vivo ainda nao realizados. |
| Hospedagem publica | Fora do escopo desta entrega. Deploy e bonus opcional do case. |

O exercicio de logica tem duracao de dez minutos e e separado da apresentacao. O case exige videochamada, nao entrega de video gravado. O endereco localhost nao constitui uma URL publica da aplicacao.

## Links

- [Repositorio publico](https://github.com/reisgabriel767-max/split-and-go)
- [README](https://github.com/reisgabriel767-max/split-and-go/blob/main/README.md)
- [CI da versao publicada, anterior a exclusao](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034)
- [Issues](https://github.com/reisgabriel767-max/split-and-go/issues)
- [Historico de commits](https://github.com/reisgabriel767-max/split-and-go/commits/main/)
- [Quadro publico de acompanhamento](https://github.com/users/reisgabriel767-max/projects/1)
- [Aplicacao local](http://127.0.0.1:3000), enquanto o servidor estiver ativo
