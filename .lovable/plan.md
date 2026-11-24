# Carros que estão na planilha de estoque mas aparecem como "Vendidos"

## O que aconteceu
A importação de 24/11 leu as 1.068 linhas e atualizou os 1.068 carros. Nenhum se perdeu.
Só que 13 deles foram para a aba **Vendidos**, e não para a lista principal. Por isso aparecem 1.055.

O motivo: esses 13 carros constam no **Histórico de Vendas** com uma venda posterior à data em que entraram no estoque (vendas entre 23/09 e 31/10). A regra atual diz que, se há venda depois da entrada, o carro está vendido, mesmo que ainda venha na planilha de estoque.

Placas: TCD2C78, SFT4A07, TEO5I55, RTX3J17, SFQ8B81, QXA7A49, TCX6J59, TCM9C52, SGC3J36, RBG8G54, SYK6H68, RBX9E95, RTX3B22.

Na prática, devem ser carros vendidos e depois devolvidos, recomprados ou com venda cancelada, mas que continuam fisicamente no estoque.

## Ajuste proposto
- A planilha de estoque passa a mandar: se o carro está na importação de estoque mais recente, ele fica na lista principal, mesmo que tenha venda antiga no histórico.
- Um carro só vai para **Vendidos** quando há uma venda e ele **não** vem mais na planilha de estoque.
- Os 13 carros voltam para a lista principal logo depois do ajuste, e a contagem fica em 1.068.
- O histórico de vendas desses carros não é apagado. Ele continua contando no cálculo de preços como hoje.

## Detalhes técnicos
- `src/lib/estoque.ts` (importação de estoque, cerca da linha 1280): quando o registro é localizado na planilha, definir `em_vendido = false` sempre; remover o uso de `vendaMaxPorChassi` nesse ramo.
- Revisar a rotina das linhas ~1500 a 1520 (marcação de vendidos pela importação de vendas) para marcar como vendido só carros que não estão na última importação de estoque.
- Corrigir os 13 registros atuais (`em_vendido = false`).
- Adicionar teste: carro presente na planilha de estoque com venda anterior continua ativo.

---

# Carros em repasse com os mesmos dados na lista principal

## O que encontrei
- Os 240 carros em repasse já cruzam com a base de anúncios pelo chassi (235 têm anúncio). Na lista principal, os canais e o valor importado aparecem igual aos demais.
- A diferença está no cálculo: quando o carro entra na faixa de mudança de finalidade, o sistema só muda a finalidade e não atualiza faixa, valor sugerido, margem nem memória de cálculo. 20 carros em repasse estão sem valor sugerido e 19 sem faixa.
- As telas **Anunciados** e **Ações/Leads** ainda usam só os carros fora do repasse. Por isso a Regional e as ações desses carros não aparecem lá.

## Ajuste proposto
- Ao entrar no repasse, o carro continua sendo precificado como os demais: faixa, valor sugerido (respeitando o congelamento por faixa), margem, histórico e memória de cálculo. Ele recebe também a marca de Repasse.
- Anunciados e Ações/Leads passam a considerar os carros em repasse.
- Rodar o recálculo para preencher os 20 carros sem valor e os 19 sem faixa.
- A lista de Repasse continua igual.

## Detalhes técnicos
- `estoque-motor.ts`: a regra `finalidade` passa a calcular o preço pela regra de valor da faixa (ou a manter o preço atual, se não houver regra de valor) e devolve `moverParaRepasse: true` junto com `valorNovo`.
- `estoque.ts` (`persistir`): aplicar `em_repasse`/`finalidade_atual` e também o patch de preço e histórico, sem `return` antecipado.
- Anunciados e Ações/Leads: `getVeiculos({ incluirRepasse: true })`.
- Teste: um carro na faixa de finalidade recebe faixa e valor e fica marcado como repasse.
