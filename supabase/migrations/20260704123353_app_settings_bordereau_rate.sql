-- Persisted app settings + audit. First use: the bordereau underwriter insurance
-- rate, which was a free-typed field that silently reverted with no record of
-- what was applied when. Now it is stored, defaults to the stored value, and every
-- change is audited (who, when, old -> new) like the partner rates.

create table if not exists public.app_settings (
  key text primary key,
  num_value numeric,
  updated_by uuid,
  updated_by_name text,
  updated_at timestamptz not null default now()
);
insert into public.app_settings(key, num_value, updated_by_name)
values ('bordereau_insurance_rate', 13.5, 'opndoor')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists app_settings_admin_read on public.app_settings;
create policy app_settings_admin_read on public.app_settings
  for select to authenticated using (public.is_admin());
drop policy if exists require_aal2 on public.app_settings;
create policy require_aal2 on public.app_settings
  as restrictive for all to authenticated using (public.is_aal2()) with check (public.is_aal2());

create table if not exists public.settings_audit (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  old_value text,
  new_value text,
  actor text,
  actor_id uuid,
  at timestamptz not null default now()
);
create index if not exists settings_audit_key_at_idx on public.settings_audit(key, at desc);
alter table public.settings_audit enable row level security;
drop policy if exists settings_audit_admin_read on public.settings_audit;
create policy settings_audit_admin_read on public.settings_audit
  for select to authenticated using (public.is_admin());
drop policy if exists require_aal2 on public.settings_audit;
create policy require_aal2 on public.settings_audit
  as restrictive for all to authenticated using (public.is_aal2()) with check (public.is_aal2());

-- Admin + AAL2 gated setter; audits only a real change; append-only audit table.
create or replace function public.set_app_setting_num(p_key text, p_value numeric)
returns public.app_settings
language plpgsql security definer set search_path to ''
as $function$
declare cur public.app_settings; res public.app_settings; who text; me uuid := auth.uid();
begin
  if not public.is_aal2() then raise exception 'MFA required' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'not permitted' using errcode = '42501'; end if;
  if p_key <> 'bordereau_insurance_rate' then raise exception 'Unknown setting' using errcode = '22023'; end if;
  if p_value is null or p_value < 0 or p_value > 100 then raise exception 'Rate must be between 0 and 100' using errcode = '22023'; end if;

  select * into cur from public.app_settings where key = p_key;
  who := coalesce((select full_name from public.users where id = me), 'an administrator');

  if cur.key is null then
    insert into public.app_settings(key, num_value, updated_by, updated_by_name)
    values (p_key, p_value, me, who) returning * into res;
    insert into public.settings_audit(key, old_value, new_value, actor, actor_id)
    values (p_key, null, p_value::text, who, me);
    return res;
  end if;

  if cur.num_value is distinct from p_value then
    insert into public.settings_audit(key, old_value, new_value, actor, actor_id)
    values (p_key, cur.num_value::text, p_value::text, who, me);
    update public.app_settings
      set num_value = p_value, updated_by = me, updated_by_name = who, updated_at = now()
      where key = p_key returning * into res;
    return res;
  end if;

  return cur; -- unchanged: no audit, no timestamp churn
end $function$;

revoke execute on function public.set_app_setting_num(text, numeric) from public, anon;
grant execute on function public.set_app_setting_num(text, numeric) to authenticated;
