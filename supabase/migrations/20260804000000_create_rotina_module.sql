-- ============================================================
-- Módulo: Gestão de Rotina e Tarefas
-- ============================================================

-- 1. Setores do núcleo
create table if not exists public.rotina_setores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#6366f1',
  ativo boolean not null default true,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Vínculo setor ↔ função (tipo_usuario_config)
create table if not exists public.rotina_setor_funcoes (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.rotina_setores(id) on delete cascade,
  funcao_valor text not null,
  created_at timestamptz not null default now(),
  unique(setor_id, funcao_valor)
);

-- 3. Vínculo setor ↔ usuário (many-to-many)
create table if not exists public.rotina_setor_usuarios (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid not null references public.rotina_setores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(setor_id, user_id)
);

-- 4. Atividades de rotina
create table if not exists public.rotina_atividades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  setor_id uuid references public.rotina_setores(id) on delete set null,
  frequencia text not null check (frequencia in ('semanal', 'mensal', 'sob_demanda')),
  dias_semana int[] default '{}',
  periodo_mensal text,
  descricao text not null default '',
  ordem int not null default 0,
  ativo boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Tarefas pontuais
create table if not exists public.rotina_tarefas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  setor_id uuid references public.rotina_setores(id) on delete set null,
  status text not null default 'a_fazer' check (status in ('a_fazer', 'fazendo', 'concluido')),
  prazo date,
  descricao text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Anexos (atividades e tarefas)
create table if not exists public.rotina_anexos (
  id uuid primary key default gen_random_uuid(),
  entidade text not null check (entidade in ('atividade', 'tarefa')),
  entidade_id uuid not null,
  arquivo_path text not null,
  nome_original text not null,
  tipo_mime text,
  tamanho int,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 7. KPIs do time
create table if not exists public.rotina_kpis (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade text not null default '',
  valor_atual numeric not null default 0,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Histórico mensal dos KPIs
create table if not exists public.rotina_kpi_historico (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.rotina_kpis(id) on delete cascade,
  mes text not null,
  valor numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(kpi_id, mes)
);

-- 9. Mural de avisos
create table if not exists public.rotina_avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null default '',
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. Missão / propósito (singleton)
create table if not exists public.rotina_missao (
  id uuid primary key default gen_random_uuid(),
  conteudo text not null default '',
  updated_at timestamptz not null default now()
);

-- Inserir registro padrão de missão
insert into public.rotina_missao (id, conteudo)
values ('00000000-0000-0000-0000-000000000001', '')
on conflict (id) do nothing;

-- ============================================================
-- Storage Bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('rotina-anexos', 'rotina-anexos', false)
on conflict (id) do nothing;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Setores: usuários autenticados veem setores ativos
alter table public.rotina_setores enable row level security;

create policy "setores_select" on public.rotina_setores
  for select to authenticated
  using (
    ativo = true
    and (
      id in (select setor_id from public.rotina_setor_usuarios where user_id = auth.uid())
      or id not in (select setor_id from public.rotina_setor_usuarios)
      or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
    )
  );

create policy "setores_insert" on public.rotina_setores
  for insert to authenticated
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "setores_update" on public.rotina_setores
  for update to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "setores_delete" on public.rotina_setores
  for delete to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Setor Funções
alter table public.rotina_setor_funcoes enable row level security;

create policy "setor_funcoes_all" on public.rotina_setor_funcoes
  for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Setor Usuários
alter table public.rotina_setor_usuarios enable row level security;

create policy "setor_usuarios_select" on public.rotina_setor_usuarios
  for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

create policy "setor_usuarios_all" on public.rotina_setor_usuarios
  for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Atividades
alter table public.rotina_atividades enable row level security;

create policy "atividades_select" on public.rotina_atividades
  for select to authenticated
  using (
    ativo = true
    and (
      setor_id is null
      or setor_id in (select setor_id from public.rotina_setor_usuarios where user_id = auth.uid())
      or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
    )
  );

create policy "atividades_insert" on public.rotina_atividades
  for insert to authenticated
  with check (
    setor_id is null
    or setor_id in (select setor_id from public.rotina_setor_usuarios where user_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "atividades_update" on public.rotina_atividades
  for update to authenticated
  using (
    setor_id is null
    or setor_id in (select setor_id from public.rotina_setor_usuarios where user_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "atividades_delete" on public.rotina_atividades
  for delete to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Tarefas
alter table public.rotina_tarefas enable row level security;

create policy "tarefas_select" on public.rotina_tarefas
  for select to authenticated
  using (
    setor_id is null
    or setor_id in (select setor_id from public.rotina_setor_usuarios where user_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "tarefas_insert" on public.rotina_tarefas
  for insert to authenticated
  with check (
    setor_id is null
    or setor_id in (select setor_id from public.rotina_setor_usuarios where user_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "tarefas_update" on public.rotina_tarefas
  for update to authenticated
  using (
    setor_id is null
    or setor_id in (select setor_id from public.rotina_setor_usuarios where user_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "tarefas_delete" on public.rotina_tarefas
  for delete to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Anexos
alter table public.rotina_anexos enable row level security;

create policy "anexos_select" on public.rotina_anexos
  for select to authenticated using (true);

create policy "anexos_insert" on public.rotina_anexos
  for insert to authenticated with check (uploaded_by = auth.uid());

create policy "anexos_delete" on public.rotina_anexos
  for delete to authenticated
  using (
    uploaded_by = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- KPIs
alter table public.rotina_kpis enable row level security;

create policy "kpis_select" on public.rotina_kpis
  for select to authenticated using (true);

create policy "kpis_all" on public.rotina_kpis
  for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- KPI Histórico
alter table public.rotina_kpi_historico enable row level security;

create policy "kpi_historico_select" on public.rotina_kpi_historico
  for select to authenticated using (true);

create policy "kpi_historico_all" on public.rotina_kpi_historico
  for all to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Avisos
alter table public.rotina_avisos enable row level security;

create policy "avisos_select" on public.rotina_avisos
  for select to authenticated using (true);

create policy "avisos_insert" on public.rotina_avisos
  for insert to authenticated with check (criado_por = auth.uid());

create policy "avisos_update" on public.rotina_avisos
  for update to authenticated
  using (
    criado_por = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "avisos_delete" on public.rotina_avisos
  for delete to authenticated
  using (
    criado_por = auth.uid()
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Missão
alter table public.rotina_missao enable row level security;

create policy "missao_select" on public.rotina_missao
  for select to authenticated using (true);

create policy "missao_update" on public.rotina_missao
  for update to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- ============================================================
-- Storage Policies (rotina-anexos bucket)
-- ============================================================

create policy "rotina_anexos_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'rotina-anexos');

create policy "rotina_anexos_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rotina-anexos');

create policy "rotina_anexos_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'rotina-anexos');

-- ============================================================
-- Functions
-- ============================================================

-- Função para verificar se usuário pertence a um setor
create or replace function public.user_has_setor(p_setor_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.rotina_setor_usuarios
    where setor_id = p_setor_id and user_id = p_user_id
  ) or exists (
    select 1 from public.user_roles where user_id = p_user_id and role = 'admin'
  );
$$;

-- Função para obter setores do usuário
create or replace function public.user_setores(p_user_id uuid default auth.uid())
returns table(setor_id uuid, setor_nome text, setor_cor text)
language sql
security definer
stable
as $$
  select s.id, s.nome, s.cor
  from public.rotina_setores s
  where s.ativo = true
    and (
      s.id in (select su.setor_id from public.rotina_setor_usuarios su where su.user_id = p_user_id)
      or s.id not in (select su.setor_id from public.rotina_setor_usuarios su)
      or exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin')
    )
  order by s.ordem, s.nome;
$$;
