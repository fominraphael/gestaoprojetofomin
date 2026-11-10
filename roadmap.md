## Dashboard Preparação/Anúncios
- [x] Criar resumo, gráficos, filtros e tela cheia.
- [x] Cadastrar 86 vínculos de gestores por loja conforme nomes do anexo (Passon: 30 nomes listados).
- [x] Implementar snapshot após Estoque BI, único por dia em São Paulo, e retenção de três meses; cadastro e rotina diária conferidos no banco.
- [x] Validar cálculos: 21 testes passaram; compilação sem erros e acesso anônimo redireciona ao login.
- [ ] Validar Dashboard, tela cheia e gravação após importação com sessão real: bloqueado porque não há sessão disponível e a conta solicitante não foi localizada; precisa de login na prévia.

## Dashboard v2 (anexo 1_9-2)
- [x] Expurgo, gráficos lado a lado, tabelas Regional/Loja/Aging, filtro Indicador, multi-seleção e modo TV; 11 testes passaram.
- [ ] Conferir na tela com login: bloqueado por falta de sessão.

## Ajustes da Matriz de Estoque
- [x] Reprocessar preços: 1.145 aplicados e conferidos, 957 alterados; histórico registrado e estabilidade validada. Três veículos com regra de Repasse preservados, sem mudança de categoria.
- [x] Retirar agrupamento FIPE e substituir filtros conforme anexo.
- [x] Filtros estilo Excel: todas as opções visíveis; destaque somente nas presentes no resultado atual, mantendo seleção e regras anteriores.
- [x] Validar regras e ordenação: dez testes passaram e compilação sem erros.
- [ ] Conferir a tela autenticada: bloqueado por falta de sessão; o acesso redireciona para login.