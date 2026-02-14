-- =============================================================
-- Migration 002: Team Invitations
-- =============================================================

-- Org invitations table
create table org_invitations (
    id uuid primary key default gen_random_uuid(),
    org_id uuid references organizations(id) on delete cascade not null,
    email text not null,
    role text check (role in ('admin', 'member')) default 'member',
    invited_by uuid references users(id) on delete set null,
    status text check (status in ('pending', 'accepted', 'cancelled')) default 'pending',
    created_at timestamptz default now(),
    accepted_at timestamptz
);

-- Only one pending invite per email per org
create unique index uq_pending_invite_per_org_email
    on org_invitations (org_id, email)
    where status = 'pending';

-- RLS
alter table org_invitations enable row level security;
create policy "Org invitations scoped to org"
    on org_invitations for all
    using (org_id in (select get_user_org_ids()));

-- =============================================================
-- Update handle_new_user() to auto-accept pending invitations
-- =============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
    invitation record;
begin
    -- Create user profile (existing behavior)
    insert into users (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', '')
    );

    -- Auto-accept pending invitations for this email
    for invitation in
        select id, org_id, role
        from org_invitations
        where email = new.email
          and status = 'pending'
    loop
        -- Add as org member
        insert into org_members (org_id, user_id, role)
        values (invitation.org_id, new.id, invitation.role)
        on conflict (org_id, user_id) do nothing;

        -- Mark invitation as accepted
        update org_invitations
        set status = 'accepted', accepted_at = now()
        where id = invitation.id;
    end loop;

    return new;
end;
$$;
