-- Partner-change audit trail + the governed update path for partner settings.
-- Rate/status/live-from edits on the Manage Partner screen now go through a
-- single SECURITY DEFINER RPC that writes an immutable audit row (who, when,
-- old -> new) for every changed field and updates the partner in one transaction.
-- Crucially it never touches applications.partner_rate/agent_rate, so existing
-- applications keep their snapshot and only NEW referrals pick up a new rate.

create table if not exists public.partner_audit (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  field text not null,          -- partner_rate | agent_rate | status | live_from | name
  old_value text,
  new_value text,
  actor text,
  at timestamptz not null default now()
);
create index if not exists partner_audit_partner_at_idx on public.partner_audit(partner_id, at desc);

alter table public.partner_audit enable row level security;

-- opndoor admins only (the Manage Partner screen is admin-only). Writes happen
-- exclusively through the definer RPC below, so there is deliberately no
-- client-facing INSERT/UPDATE/DELETE policy: the log is append-only and unforgeable.
drop policy if exists partner_audit_admin_read on public.partner_audit;
create policy partner_audit_admin_read on public.partner_audit
  for select to authenticated using (public.is_admin());

-- Same app-wide MFA invariant as every other table: no rows at all below AAL2,
-- so a password-only (AAL1) session can never read the rate-change history.
drop policy if exists require_aal2 on public.partner_audit;
create policy require_aal2 on public.partner_audit
  as restrictive for all to authenticated
  using (public.is_aal2()) with check (public.is_aal2());

create or replace function public.update_partner_settings(
  p_slug text,
  p_name text,
  p_status text,
  p_live_from date,
  p_partner_rate numeric,
  p_agent_rate numeric
) returns public.partners
language plpgsql
security definer
set search_path to ''
as $function$
declare cur public.partners; res public.partners; who text;
begin
  if not public.is_aal2() then raise exception 'MFA required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'not permitted' using errcode = '42501'; end if;

  select * into cur from public.partners where slug = p_slug;
  if cur.id is null then raise exception 'Partner not found' using errcode = '22023'; end if;

  if btrim(coalesce(p_name,'')) = '' then raise exception 'Partner name is required' using errcode = '22023'; end if;
  if p_partner_rate is null or p_partner_rate < 0 or p_partner_rate > 1 then raise exception 'Partner commission must be between 0 and 100%%' using errcode = '22023'; end if;
  if p_agent_rate is null or p_agent_rate < 0 or p_agent_rate > 1 then raise exception 'Agent commission must be between 0 and 100%%' using errcode = '22023'; end if;
  if coalesce(p_status,'') not in ('active','onboarding','paused') then raise exception 'Invalid status' using errcode = '22023'; end if;

  who := coalesce((select full_name from public.users where id = auth.uid()), 'opndoor admin');

  -- One audit row per changed field (old -> new). Rates are recorded as whole
  -- percentages for a human-readable trail.
  if cur.partner_rate is distinct from p_partner_rate then
    insert into public.partner_audit(partner_id, field, old_value, new_value, actor)
    values (cur.id, 'partner_rate', round(cur.partner_rate*100)::text || '%', round(p_partner_rate*100)::text || '%', who);
  end if;
  if cur.agent_rate is distinct from p_agent_rate then
    insert into public.partner_audit(partner_id, field, old_value, new_value, actor)
    values (cur.id, 'agent_rate', round(cur.agent_rate*100)::text || '%', round(p_agent_rate*100)::text || '%', who);
  end if;
  if cur.status is distinct from p_status then
    insert into public.partner_audit(partner_id, field, old_value, new_value, actor)
    values (cur.id, 'status', cur.status, p_status, who);
  end if;
  if cur.live_from is distinct from p_live_from then
    insert into public.partner_audit(partner_id, field, old_value, new_value, actor)
    values (cur.id, 'live_from', coalesce(to_char(cur.live_from,'YYYY-MM'),'—'), coalesce(to_char(p_live_from,'YYYY-MM'),'—'), who);
  end if;
  if cur.name is distinct from p_name then
    insert into public.partner_audit(partner_id, field, old_value, new_value, actor)
    values (cur.id, 'name', cur.name, p_name, who);
  end if;

  update public.partners
    set name = p_name, status = p_status, live_from = p_live_from,
        partner_rate = p_partner_rate, agent_rate = p_agent_rate
    where id = cur.id
    returning * into res;

  return res;
end $function$;

-- Callable only by signed-in users (never anon); the body still gates on
-- is_aal2() + is_admin(). Mirrors the revoke_anon_function_execute convention
-- applied to every other SECURITY DEFINER RPC.
revoke execute on function public.update_partner_settings(text, text, text, date, numeric, numeric) from public, anon;
grant execute on function public.update_partner_settings(text, text, text, date, numeric, numeric) to authenticated;
