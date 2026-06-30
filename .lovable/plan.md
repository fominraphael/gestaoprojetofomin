## Diagnóstico

O projeto tem código-cliente para Usuários/Empresas/Documentos, mas:
- Banco só tem a tabela `tarefas`. Nenhuma tabela de `empresas`, `usuarios_sistema`, `documentos_tipo`, `documentos_arquivo`, `tipos_usuario_config`.
- Nenhum bucket de Storage existe.
- Sidebar e rotas do app **só** mostram o gestor de tarefas (Dashboard, Backlog, Roadmap, Solicitações, Lixeira). Não há rotas `/empresas`, `/documentos`, `/lojistas`, `/importacao`.
- Só existe `src/routes/admin/usuarios.tsx`.

Por isso "reseta ao atualizar" — tudo vive em `localStorage` e some quando você troca de navegador / limpa cache / dá deploy novo.

## O que vou fazer

### 1. Backend (Supabase migrations)

Criar tabelas com RLS + GRANTs:
- `empresas` (cnpj único, nome)
- `documentos_tipo` (nome único, descricao)
- `documentos_arquivo` (empresa_id FK, tipo_id FK, arquivo_url, arquivo_nome)
- `tipos_usuario_config` (nome, role, campos_schema jsonb, ativo)
- `usuarios_sistema` (username único, password_hash, role, status, tipo_usuario, ativo, modulos, campos_customizados jsonb)
- View `usuarios_sistema_public` que oculta `password_hash` (escopo de segurança)

Criar bucket `documentos` (privado, 10 MB de limite, signed URLs).

Seed: tipos de documento padrão + tipos de usuário padrão (Administrador, Lojista, ADM de loja) + usuário `root` (somente se ainda não existir — não reseta a cada deploy).

### 2. Bugs

- **Permissão Admin → Documentação**: módulo `documentos` incluído por padrão no perfil Administrador; gate de menu lê `modulos` do usuário.
- **Persistência**: refatorar `src/lib/usuarios.ts` e `src/lib/empresas.ts` para usar **apenas** Supabase (remover fallback `localStorage` que sobrescreve). Migração one-shot que importa o que estiver em `localStorage` na primeira carga após login (opcional, perguntar depois).
- **Upload +2MB**: bucket criado com `file_size_limit = 10485760` (10 MB). Cliente valida ≤10 MB antes do upload e mostra erro amigável.
- **Rota 404**: adicionar `notFoundComponent` no `__root.tsx` apontando para uma página `NotFoundPage` personalizada. URLs como `/teste` cairão nela.

### 3. UI / Menus

- Sidebar do Portal: adicionar entradas **Usuários**, **Empresas**, **Tipos de Documento**, **Perfis** (visíveis conforme `modulos` do usuário). O atual "Gestão de Projetos" continua intacto.
- Renomear "Gerenciar Lojistas" → **Usuários** (rota `/admin/usuarios` mantida).
- **Barra de busca** no topo da listagem de usuários (filtra por username, tipo, status, CNPJ).
- **Importação em Massa** vira uma aba/botão dentro de `/admin/usuarios` (modal com upload CSV/XLSX → preview → confirmar). Remover qualquer menu antigo de importação.

### 4. CRUDs

- **Perfis (`/admin/perfis`)**: tabela com Cadastrar / Editar / Inativar / Excluir. Editor de `campos_schema` (nome, label, tipo, obrigatório).
- **Empresas (`/admin/empresas`)**: além de Excluir, modal de **Editar** (CNPJ + nome).
- **Tipos de Documento (`/admin/documentos-tipo`)**: além de Cadastrar/Excluir, **Editar** (nome + descrição).

### 5. Segurança

- RLS ligado em todas as tabelas novas.
- View pública para `usuarios_sistema` esconde `password_hash`.
- Bucket `documentos` **privado**; downloads via signed URL (60 s).
- Atualizar `@security-memory` refletindo o novo modelo (custom auth + RLS permissivas para `anon` no app de tarefas continua, mas as tabelas novas exigem que o cliente filtre por usuário logado em camada de aplicação, já que não usamos Supabase Auth).

## Detalhes técnicos

```text
Ordem de execução:
1) Migration: tipos enum + tabelas + GRANTs + RLS + view + trigger updated_at + seed
2) Bucket 'documentos' privado, 10 MB
3) Refatorar src/lib/{usuarios,empresas}.ts → só Supabase
4) Páginas novas: /admin/perfis, /admin/empresas, /admin/documentos-tipo, /admin/documentos
5) Modal de edição em empresas e documentos_tipo
6) Sidebar do Portal + gate de módulos
7) NotFoundPage + notFoundComponent no __root
8) Importação em Massa dentro de /admin/usuarios
9) Atualizar security memory
```

## Riscos / pontos abertos

- **Senhas**: hoje o login compara SHA-256 client-side. Isso é fraco. Vou manter por compatibilidade, mas recomendo migrar para Supabase Auth depois (fora deste lote).
- **Dados em localStorage hoje**: não migro automaticamente — quem já cadastrou empresa/usuário em localStorage vai precisar recadastrar. Posso adicionar um botão "Importar do navegador" se quiser.
- **Importação em massa**: vou assumir CSV com colunas `username,password,tipo_usuario,cnpj,nome_loja`. Se o seu CSV tem outro formato, me passa um exemplo antes.
- Esse lote é grande (~15-20 arquivos novos/alterados). Vou fazer numa sequência só, como você pediu, mas pode haver pequenos ajustes depois.
