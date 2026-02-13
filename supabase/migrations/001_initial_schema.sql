-- Marketing Delivery Engine - Initial Schema
-- Run this in the Supabase SQL Editor

-- Enable pgvector extension
create extension if not exists vector;

-- =============================================================
-- Organizations (agencies / multi-tenant root)
-- =============================================================
create table organizations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    created_at timestamptz default now()
);

-- =============================================================
-- Users (extends Supabase auth.users)
-- =============================================================
create table users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text,
    avatar_url text,
    created_at timestamptz default now()
);

-- =============================================================
-- Organization membership
-- =============================================================
create table org_members (
    id uuid primary key default gen_random_uuid(),
    org_id uuid references organizations(id) on delete cascade not null,
    user_id uuid references users(id) on delete cascade not null,
    role text check (role in ('owner', 'admin', 'member')) default 'member',
    created_at timestamptz default now(),
    unique(org_id, user_id)
);

-- =============================================================
-- Clients (projects)
-- =============================================================
create table clients (
    id uuid primary key default gen_random_uuid(),
    org_id uuid references organizations(id) on delete cascade not null,
    name text not null,
    slug text not null,
    website_url text,
    status text check (status in ('onboarding', 'active', 'archived')) default 'onboarding',
    created_at timestamptz default now(),
    created_by uuid references users(id),
    unique(org_id, slug)
);

-- =============================================================
-- Client team assignments
-- =============================================================
create table client_members (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references clients(id) on delete cascade not null,
    user_id uuid references users(id) on delete cascade not null,
    role text check (role in ('lead', 'member')) default 'member',
    created_at timestamptz default now(),
    unique(client_id, user_id)
);

-- =============================================================
-- Brand Identity (structured brand DNA per client)
-- =============================================================
create table brand_identity (
    id uuid primary key default gen_random_uuid(),
    client_id uuid unique references clients(id) on delete cascade not null,
    colors jsonb default '[]'::jsonb,
    fonts jsonb default '[]'::jsonb,
    logos jsonb default '[]'::jsonb,
    tone jsonb default '{}'::jsonb,
    visual_style jsonb default '{}'::jsonb,
    content_rules jsonb default '{}'::jsonb,
    updated_at timestamptz default now()
);

-- =============================================================
-- Company Info (structured, from scraping + uploads)
-- =============================================================
create table company_info (
    id uuid primary key default gen_random_uuid(),
    client_id uuid unique references clients(id) on delete cascade not null,
    name text,
    tagline text,
    mission text,
    vision text,
    about text,
    services jsonb default '[]'::jsonb,
    offerings jsonb default '[]'::jsonb,
    team jsonb default '[]'::jsonb,
    case_studies jsonb default '[]'::jsonb,
    differentiators jsonb default '[]'::jsonb,
    updated_at timestamptz default now()
);

-- =============================================================
-- Uploaded brand assets
-- =============================================================
create table brand_assets (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references clients(id) on delete cascade not null,
    type text check (type in ('pdf', 'image', 'font', 'deck', 'spreadsheet', 'document', 'other')),
    original_filename text not null,
    storage_path text not null,
    file_size bigint,
    mime_type text,
    processing_status text check (processing_status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
    extracted_data jsonb,
    uploaded_by uuid references users(id),
    created_at timestamptz default now()
);

-- =============================================================
-- Vector embeddings for RAG
-- =============================================================
create table brand_embeddings (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references clients(id) on delete cascade not null,
    source_asset_id uuid references brand_assets(id) on delete set null,
    source_type text,
    source_url text,
    chunk_text text not null,
    chunk_index integer,
    embedding vector(1024),
    metadata jsonb,
    created_at timestamptz default now()
);

create index on brand_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- =============================================================
-- Briefs (what the user asks for)
-- =============================================================
create table briefs (
    id uuid primary key default gen_random_uuid(),
    client_id uuid references clients(id) on delete cascade not null,
    created_by uuid references users(id),
    message text not null,
    status text check (status in ('pending', 'processing', 'in_review', 'completed', 'failed')) default 'pending',
    creative_strategy jsonb,
    agent_conversation jsonb,
    created_at timestamptz default now(),
    completed_at timestamptz
);

-- =============================================================
-- Deliverables (what the agents produce)
-- =============================================================
create table deliverables (
    id uuid primary key default gen_random_uuid(),
    brief_id uuid references briefs(id) on delete cascade not null,
    client_id uuid references clients(id) on delete cascade not null,
    type text check (type in ('pdf', 'pptx', 'png', 'jpg', 'gif', 'mp4', 'text', 'social_post')),
    title text not null,
    description text,
    storage_path text not null,
    file_size bigint,
    mime_type text,
    thumbnail_path text,
    platform text,
    dimensions jsonb,
    review_status text check (review_status in (
        'pending_brand_review', 'brand_approved',
        'pending_human_review', 'approved',
        'revision_requested', 'rejected'
    )) default 'pending_brand_review',
    brand_review_notes jsonb,
    human_review_notes text,
    revision_count integer default 0,
    version integer default 1,
    created_at timestamptz default now()
);

-- =============================================================
-- Review history (audit trail)
-- =============================================================
create table review_events (
    id uuid primary key default gen_random_uuid(),
    deliverable_id uuid references deliverables(id) on delete cascade not null,
    reviewer_type text check (reviewer_type in ('brand_agent', 'human')),
    reviewer_user_id uuid references users(id),
    action text check (action in ('approved', 'revision_requested', 'rejected')),
    notes text,
    created_at timestamptz default now()
);

-- =============================================================
-- Row Level Security
-- =============================================================

-- Helper function: get user's org IDs
create or replace function get_user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
    select org_id from org_members where user_id = auth.uid()
$$;

-- Organizations: users see orgs they belong to
alter table organizations enable row level security;
create policy "Users see their orgs"
    on organizations for select
    using (id in (select get_user_org_ids()));

-- Users: can see themselves
alter table users enable row level security;
create policy "Users see themselves"
    on users for select
    using (id = auth.uid());
create policy "Users update themselves"
    on users for update
    using (id = auth.uid());

-- Org members: see members of your orgs
alter table org_members enable row level security;
create policy "See org members"
    on org_members for select
    using (org_id in (select get_user_org_ids()));

-- Clients: scoped to org
alter table clients enable row level security;
create policy "Clients scoped to org"
    on clients for all
    using (org_id in (select get_user_org_ids()));

-- Client members: scoped via client's org
alter table client_members enable row level security;
create policy "Client members via org"
    on client_members for all
    using (client_id in (
        select id from clients where org_id in (select get_user_org_ids())
    ));

-- Brand identity: scoped via client's org
alter table brand_identity enable row level security;
create policy "Brand identity via org"
    on brand_identity for all
    using (client_id in (
        select id from clients where org_id in (select get_user_org_ids())
    ));

-- Company info: scoped via client's org
alter table company_info enable row level security;
create policy "Company info via org"
    on company_info for all
    using (client_id in (
        select id from clients where org_id in (select get_user_org_ids())
    ));

-- Brand assets: scoped via client's org
alter table brand_assets enable row level security;
create policy "Brand assets via org"
    on brand_assets for all
    using (client_id in (
        select id from clients where org_id in (select get_user_org_ids())
    ));

-- Brand embeddings: scoped via client's org
alter table brand_embeddings enable row level security;
create policy "Brand embeddings via org"
    on brand_embeddings for all
    using (client_id in (
        select id from clients where org_id in (select get_user_org_ids())
    ));

-- Briefs: scoped via client's org
alter table briefs enable row level security;
create policy "Briefs via org"
    on briefs for all
    using (client_id in (
        select id from clients where org_id in (select get_user_org_ids())
    ));

-- Deliverables: scoped via client's org
alter table deliverables enable row level security;
create policy "Deliverables via org"
    on deliverables for all
    using (client_id in (
        select id from clients where org_id in (select get_user_org_ids())
    ));

-- Review events: scoped via deliverable's client's org
alter table review_events enable row level security;
create policy "Review events via org"
    on review_events for all
    using (deliverable_id in (
        select d.id from deliverables d
        join clients c on d.client_id = c.id
        where c.org_id in (select get_user_org_ids())
    ));

-- =============================================================
-- Trigger: auto-create user profile on signup
-- =============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into users (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', '')
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- =============================================================
-- Trigger: auto-create brand_identity and company_info on client creation
-- =============================================================
create or replace function handle_new_client()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into brand_identity (client_id) values (new.id);
    insert into company_info (client_id) values (new.id);
    return new;
end;
$$;

create trigger on_client_created
    after insert on clients
    for each row execute function handle_new_client();
