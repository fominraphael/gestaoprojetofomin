Escopo grande com 3 frentes independentes. Executarei nesta ordem para reduzir risco de regressão.

## 1. Formatação e compressão do Dossiê

Arquivos: `src/lib/pdf-veiculo.ts`, `src/lib/pdf-utils.ts`, e o ponto que gera o dossiê final (localizar em `painel.tsx` / `toyota-checklist.ts`).

- Criar helper `formatarModeloCurto(modelo)` que retorna as 2 primeiras palavras significativas (remove versões: XRE, XEI, GLI, SR, tokens com números tipo `2.0`, `16V`, e palavras `FLEX`, `AUT`, `CVT`, `TB`, `HYBRID` fora do nome base). Regra prática: dividir por espaço, manter tokens até encontrar o primeiro que casa com regex `/^([0-9]|XRE|XEI|GLI|SR|GR|XLE|SE|LE|FLEX|AUT|CVT|TB|HYBRID|H\d|16V|20V|V6|V8)/i`. Fallback: primeiras 2 palavras.
- `formatarModeloComAno(modelo, ano)` → `"${curto} / ${ano}"`.
- `formatarKm(km)` → `Intl.NumberFormat("pt-BR").format(Number(km))`.
- Aplicar ambos no preenchimento do AcroForm do checklist (campos `veiculo` e `km`) em `pdf-veiculo.ts` e no fluxo do dossiê.
- Compressão em `mesclarPdfs`: usar `PDFDocument.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 200 })` + `merged.setTitle("")`, `setAuthor("")`, `setSubject("")`, `setKeywords([])`, `setProducer("")`, `setCreator("")` para remover metadados. Adicionar loop opcional que percorre imagens embutidas e re-encoda via canvas para JPEG 0.7 quando o PDF final excede 3MB — implementado como best-effort com try/catch.
- Se ainda > 3MB, logar warning; não integrar API externa nesta iteração (evita adicionar secret novo sem aprovação). Deixar TODO comentado com hook para PDF.co.

## 2. Tela "Envio Toyota"

Localizar seção "Enviados para a Toyota" em `painel.tsx` (linha ~627) e no expandido do veículo. Refatorar:

- Bloco por documento (Check-list, Laudo, Health Check) com botões `Visualizar` (usa `abrirPath`/`abrirLaudo` já existentes) e `Substituir` (input file → upload storage `documentos` → update coluna correspondente em `toyota_estoque_veiculos`).
- Botão `Gerar Dossiê` / `Regerar Dossiê` sempre habilitado quando os 3 docs existem.
- Input `Código TCUV` + botão `Enviar/Concluir` renderizados condicionalmente somente após `dossie_pdf_path` estar populado.

## 3. Dashboard (renomear + limpar + filtro mês + cards)

Arquivo: `src/routes/_authenticated._toyota.toyota.painel.tsx` e `AppSidebar.tsx`.

- Sidebar: renomear label "Painel de Certificação" → "Dashboard".
- Título da página → "Dashboard".
- Remover TODO conteúdo abaixo dos cards (tabelas, listas, seções 1/2/3, filtros por aba). Manter só header + filtro Mês/Ano + grid de cards.
- Adicionar `<Select>` de mês/ano (default = mês atual). Estado `mesFiltro: "YYYY-MM"`.
- Refazer contagens baseando no `status_aprovacao` atual (snapshot) exceto "Solicitados" que usa `aprovado_em` dentro do mês:
  1. **Solicitados**: `count(aprovado_em BETWEEN inicioMes AND fimMes)`.
  2. **Preparador**: `status_aprovacao IN ('pendente_preparacao','devolvido_preparador')`.
  3. **Pós-Vendas**: `status_aprovacao = 'em_posvendas'`.
  4. **Análise Central**: `status_aprovacao IN ('analise','aguardando_analise_central')` + retornos Toyota ativos (`retorno_toyota_em NOT NULL AND status_aprovacao='analise'`).
  5. **Enviados Toyota**: `enviado_toyota_em NOT NULL AND status_aprovacao NOT IN ('certificado_toyota','arquivado','reprovado_admin')` — os que estão aguardando retorno.
  6. Remover card "Estoque importado".
- Cards 2-5 são snapshot atual (não filtram por mês); card "Solicitados" usa o mês. Deixar isso claro na UI com legenda pequena.

## Fora de escopo
- Integração com API externa de compressão (deixarei TODO). Se o usuário confirmar credenciais de PDF.co/Cloudmersive, faço em turno seguinte.
- Testes automatizados dessa refatoração.

Confirma para eu executar?