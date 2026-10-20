# Corrigir envio de notificações push

## Problema confirmado
O envio de push usa a biblioteca `web-push`, que depende de recursos do Node (Buffer, crypto) indisponíveis no servidor publicado. O envio falha antes de chegar a qualquer usuário e o erro é engolido; e-mail continua funcionando.

## O que fazer
1. Trocar `web-push` por uma biblioteca baseada em Web Crypto, compatível com o servidor publicado (ex.: `@block65/webcrypto-web-push`), que monta a assinatura VAPID e a criptografia do conteúdo.
2. Reescrever `enviarPush()` em `src/lib/notificacoes.functions.ts` mantendo o mesmo contrato (`{ enviados, erro }`), a atualização de `last_used_at` e a remoção de inscrições inválidas (404/410).
3. Manter as chaves VAPID atuais (já configuradas) — nenhum usuário precisa reautorizar notificações.
4. Remover `web-push` das dependências.

## Validação
- Gerar build de produção e confirmar ausência de erros do runtime.
- Disparar uma notificação de teste para um usuário com permissão concedida e conferir os logs do servidor (`[push] Enviado com sucesso`).
