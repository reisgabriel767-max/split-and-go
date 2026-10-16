# Aderencia ao case

Referencia: 16/10/2026. Documento de requisitos: STG_case_tech_v062026.pdf, cinco paginas. A capa indica Julho/2026; nao ha prazo de entrega inferido dessas datas.

Versao historica de referencia: 8e563d4. CI historica validada: a0a8da0, execucao 38937774034. A exclusao de grupos amplia essa versao, com 46 testes externos aprovados localmente. O resultado da CI desta revisao deve ser consultado no GitHub Actions.

## Criterios de classificacao

- Confirmado: evidencia identificada para o item e seu alcance.
- Pendente: requisito ou verificacao ainda nao concluido.
- Nao verificado: ausencia de evidencia suficiente.

## Prontidao tecnica

| Item | Estado | Evidencia |
| --- | --- | --- |
| Repositorio publico | Confirmado | API publica do GitHub retornou private: false em 16/10/2026. |
| README | Confirmado | Execucao local, diagrama, escolhas tecnicas, V2 e casos de borda documentados. |
| Diagrama atual | Confirmado | README e slide 3 representam HTTP, aplicacao, dominio, contratos e adaptadores reais. |
| Kanban publico | Confirmado | GitHub confirmou visibilidade publica em 16/10/2026. Edicao restrita. |
| Conteudo atual do quadro | Confirmado | Oito itens: um em Backlog, um em In Progress e seis em Done. Colunas In Review e Testing presentes. |
| Issues e criterios | Confirmado | Oito issues publicas: seis fechadas e duas abertas na consulta de 16/10/2026. |
| Checklists das issues | Pendente | Varias listas nao refletem o estado da implementacao. |
| Historico de commits | Confirmado | Tipos feat, fix, refactor e docs. Referencias #5 e #7 em commits anteriores; commits recentes de arquitetura/UI sem numero de issue. |
| Pagina, API e banco demonstrativo | Confirmado | Consulta local retornou grupo de Paraty, quatro membros, quatro despesas e treze partes. |
| Inicializacao a frio | Nao verificado | O servidor ja estava ativo na consulta de referencia. |
| Testes e build | Confirmado | Local: 45 testes PGlite e um ignorado; 46 externos; tipos, build e fluxo HTTP aprovados. CI publicada anterior: 38 testes. |
| Interface modernizada | Pendente | Validacao visual e interacoes reais nas larguras 1920, 1366, 768 e 390px. |
| Slides | Confirmado | Seis slides 16:9, notas, links e diagramas editaveis. Captura historica identificada. |
| Compatibilidade no PowerPoint | Nao verificado | Arquivo renderizado e validado estruturalmente, sem conferencia no PowerPoint. |
| Referencia tecnica | Confirmado | README e architecture.md descrevem modulos, regras e fluxos. |
| Compose e volume local | Nao verificado | PostgreSQL 17 em container validado apenas na CI. |
| Hospedagem publica | Nao verificado | Nao implementada. Item opcional do case. |
| Apresentacao ao vivo | Pendente | Materiais disponiveis; demonstracao e exercicio ainda nao realizados. |
| Slides da entrega | Confirmado | apresentacao-final.pptx contem seis slides, quadro publico e distingue 46 testes locais da CI historica de 38 testes. |

## Requisitos obrigatorios

| Exigencia | Pagina | Estado | Implementacao ou limite |
| --- | --- | --- | --- |
| Stack permitida | 2 | Confirmado | Node.js, Next.js, React e TypeScript. C# restrito ao iniciador local opcional. |
| Conhecimento da arquitetura e do codigo | 2 | Nao verificado | Referencias tecnicas documentadas; avaliacao individual ocorre na apresentacao. |
| Problema de logica em dez minutos | 2 | Pendente | Etapa ao vivo, com enunciado desconhecido. |
| Quadro publico com historias e criterios | 3 e 5 | Confirmado com ressalva | Leitura publica e issues com criterios; checklists ainda exigem revisao. |
| Colunas Backlog, In Progress, In Review/Testing e Done | 3 | Confirmado | Cinco colunas conferidas na interface do GitHub, com In Review e Testing separados. |
| Commits incrementais e ligados ao trabalho | 3 | Confirmado | Historico real, com referencias de issues em entregas anteriores e ressalva para commits recentes. |
| README com diagrama e infraestrutura | 3 | Confirmado | Monolito modular, banco, execucao local e ausencia de filas/cache documentados. |
| Melhorias V2 e impacto no negocio | 4 | Confirmado | Contas/convites, cotacoes com fonte/data e pagamentos/lembretes propostos no README. |
| Pelo menos tres casos de borda | 4 | Confirmado | Centavos, partes inconsistentes, taxa invalida, historico e ausencia de dividas documentados e testados. |
| Grupos e integrantes | 4 | Confirmado | createGroup, addGroupMember, Zod e restricoes SQL. Novos grupos limitados a vinte. |
| Um pagador e N participantes | 4 | Confirmado | payerId, memberIds e partes; pagador pode ficar fora da divisao. |
| Igualitario, percentual ou fixo | 4 | Confirmado | Tres modalidades com validacao no dominio e previas no formulario. |
| Minimizacao das transferencias | 3 e 4 | Confirmado | Limite inferior e DP ate vinte saldos nao nulos. Legados maiores podem receber plano simplificado. |
| Compensacao da cadeia A, B e C | 4 | Confirmado | Teste de cadeia e cenario de duas despesas que resulta em uma transferencia. |
| Extrato individual e plano final | 4 | Confirmado | GroupPanels e SettlementPanel. Sem registro de pagamentos efetivos. |
| Moedas diferentes | 3 | Confirmado | BRL, USD e EUR com cotacao manual e historico. |
| Colaboracao em tempo real no contexto do produto | 3 | Pendente | Atualizacao apos operacoes e recarga. Sem sincronizacao automatica entre navegadores. |
| Demonstracao e defesa em videochamada | 4 | Pendente | Materiais preparados; evento ao vivo ainda nao realizado. |
| Apresentacao de board e versionamento | 4 | Pendente | Historico e quadro publicos. Demonstracao ao vivo ainda nao realizada. |
| Fonte completo e instrucoes de startup | 5 | Confirmado | Repositorio publico com npm ci/dev e instrucao Docker. Executavel local e opcional. |
| Link do quadro aberto a leitura | 5 | Confirmado | Quadro com visibilidade publica no GitHub. |
| Aplicacao hospedada, bonus | 5 | Nao verificado | Sem deploy ou URL publica. Localhost e restrito ao computador de execucao. |

O painel minimo do case exige extrato e plano de liquidacao, sem integracao bancaria obrigatoria. A apresentacao de quinze minutos e seis slides e um formato de referencia; o PDF especifica videochamada e dez minutos separados para logica.

## Criterios de avaliacao

| Criterio | Evidencias disponiveis |
| --- | --- |
| Aderencia | Matriz de requisitos com limites explicitos. |
| Experiencia de uso | Interface funcional e modernizada; revisao visual atual pendente, sem estudo de usabilidade. |
| Qualidade de apresentacao | Slides, cenario funcional e referencias de codigo. Avaliacao ao vivo ainda nao realizada. |
| Arquitetura e infraestrutura | Diagrama, contratos, transacoes e escolha dos adaptadores documentados. |
| Entendimento do codigo | Fluxos e responsabilidades dos modulos documentados na arquitetura. Avaliacao individual ainda nao realizada. |
| Autogestao | Issues, commits e quadro publicos. Checklists pendentes de revisao. |

## Links

- [Repositorio](https://github.com/reisgabriel767-max/split-and-go)
- [README](https://github.com/reisgabriel767-max/split-and-go/blob/main/README.md)
- [CI 38937774034](https://github.com/reisgabriel767-max/split-and-go/actions/runs/38937774034)
- [Issues](https://github.com/reisgabriel767-max/split-and-go/issues)
- [Issue 5: saldos](https://github.com/reisgabriel767-max/split-and-go/issues/5)
- [Issue 7: entrega](https://github.com/reisgabriel767-max/split-and-go/issues/7)
- [Issue 8: setup](https://github.com/reisgabriel767-max/split-and-go/issues/8)
- [Commits](https://github.com/reisgabriel767-max/split-and-go/commits/main/)
- [Quadro publico](https://github.com/users/reisgabriel767-max/projects/1)
