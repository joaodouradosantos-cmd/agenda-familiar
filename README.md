# Agenda Familiar (Next.js + PWA)

Aplicação simples de **Tarefas** e **Calendário**, pensada para funcionar bem em telemóvel e ser usada pela família.

## Como correr localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Deploy (Vercel)

- Importar o repositório
- Build Command: `npm run build`
- Output: padrão do Next.js

Depois de publicar, no telemóvel pode ser instalada como app (PWA) via “Adicionar ao ecrã principal”.

## Notas

- **Tarefas e Calendário** guardam dados online no **Supabase** (partilhado pela família).
- O Service Worker encontra-se em `public/sw.js`.

## Partilha por convite (automático)

Este projeto suporta *invite-only* com Magic Link (email). O dono (o teu email) envia convites e só esses utilizadores entram na família automaticamente.

### Variáveis de ambiente (Vercel)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` (server only — NUNCA expor no browser)
- `OWNER_EMAIL` (o teu email, em minúsculas)
- `FAMILY_ID` (server) **ou** `NEXT_PUBLIC_FAMILY_ID` (client/server) — UUID da tua família na tabela `families`
- `SITE_URL` (opcional, ex.: `https://agenda-familiar-roan.vercel.app`)

### SQL necessário no Supabase (tabela de convites)

Criar tabela `invites` (para auto-aceitar no primeiro login):

```sql
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  accepted_at timestamptz null
);

alter table public.invites enable row level security;

-- Os convites são geridos por API server com Service Role.
-- Podes manter sem policies e aceder apenas via service role.
```

### SQL necessário no Supabase (tabela de eventos do calendário)

Criar tabela `events` para o calendário (online e partilhado):

```sql
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  category text not null default 'Outros',
  start_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

-- SELECT: membros lêem eventos da família
drop policy if exists "Read events in my families" on public.events;
create policy "Read events in my families"
on public.events for select
to authenticated
using (
  exists (
    select 1
    from public.family_members fm
    where fm.family_id = events.family_id
      and fm.user_id = auth.uid()
  )
);

-- INSERT: membros criam eventos na família
drop policy if exists "Create events in my families" on public.events;
create policy "Create events in my families"
on public.events for insert
to authenticated
with check (
  exists (
    select 1
    from public.family_members fm
    where fm.family_id = events.family_id
      and fm.user_id = auth.uid()
  )
);

-- UPDATE: membros editam eventos da família
drop policy if exists "Update events in my families" on public.events;
create policy "Update events in my families"
on public.events for update
to authenticated
using (
  exists (
    select 1
    from public.family_members fm
    where fm.family_id = events.family_id
      and fm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.family_members fm
    where fm.family_id = events.family_id
      and fm.user_id = auth.uid()
  )
);

-- DELETE: membros removem eventos da família
drop policy if exists "Delete events in my families" on public.events;
create policy "Delete events in my families"
on public.events for delete
to authenticated
using (
  exists (
    select 1
    from public.family_members fm
    where fm.family_id = events.family_id
      and fm.user_id = auth.uid()
  )
);
```

### Fluxo

1) Admin envia convite em **Membros**.
2) A pessoa recebe email e entra (Magic Link).
3) A app chama `/api/accept-invite` e adiciona automaticamente à `family_members`.
4) A partir daí, **Tarefas e Calendário** ficam sempre disponíveis em qualquer dispositivo (basta voltar a entrar por email).
