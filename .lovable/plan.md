# Botão de diagnóstico de campos do template

## Objetivo
Permitir que você confira, direto no painel de **Configurações → Templates de Check-list**, se o PDF em Base64 que acabou de subir contém os campos AcroForm com os nomes corretos (`veiculo`, `chassi`, `km`, `dn`, `distribuidor`, `avaliador`, `tecnico`, `data01`, `data02`, `data03`, `hora`, `minuto`).

Assim, antes de gerar um checklist real, você já sabe se precisa voltar ao Acrobat para renomear algum campo.

## O que muda na interface

Em cada uma das 6 linhas de template (TCUV × {HEV, Utilitário, Passeio} e TSIM × {HEV, Utilitário, Passeio}), além dos botões atuais (upload / remover), aparece um novo botão:

- **"Diagnosticar campos"** (ícone de lupa)

Ao clicar:
1. Lê o Base64 salvo em `system_settings` daquela combinação.
2. Carrega com `pdf-lib` no navegador (nada de servidor).
3. Extrai a lista de nomes de campos via `PDFDocument.getForm().getFields()`.
4. Abre um modal com:
   - **Total de campos** detectados.
   - **Tabela comparativa**: para cada nome esperado, mostra ✅ (encontrado) ou ❌ (ausente).
   - **Campos extras** que existem no PDF mas o sistema não usa (só informativo).
   - Botão "Copiar lista" para ajudar caso você queira ajustar nomes no Acrobat.

Se o total for 0, o modal exibe um aviso destacado: *"Este PDF não contém campos de AcroForm. Volte ao Acrobat / LibreOffice e adicione os campos de texto conforme o guia."*

## Detalhes técnicos

- Arquivo novo: `src/components/toyota/DiagnosticoCamposTemplate.tsx` (componente do modal + botão).
- Arquivo novo: `src/lib/pdf-diagnostico.ts` com a função `listarCamposPdf(base64: string): Promise<{ nome: string; tipo: string }[]>`.
- Integração: `src/routes/_authenticated._toyota.toyota.configuracoes.tsx` — importa o novo botão e renderiza ao lado dos existentes em cada linha da tabela de templates.
- Lista canônica de campos esperados fica em constante exportada de `src/lib/checklist-template.ts` (`CAMPOS_ESPERADOS_TEMPLATE`) para não duplicar strings.
- Modal usa componentes já existentes (`Dialog`, `Table`, `Badge` do shadcn) — sem novas dependências.
- 100% client-side: nenhuma migration, nenhuma edge function, nenhuma alteração no Supabase.

## Fora do escopo (não faz agora)
- Não altera a lógica de preenchimento (`gerarChecklistPreenchido`).
- Não altera a rotina do botão "Gerar PDF do Veículo".
- Não mexe na estrutura de armazenamento em `system_settings`.
