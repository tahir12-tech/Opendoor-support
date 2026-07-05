-- =====================================================================
-- Money-path fix: partner-rate audit trail must show ONE DECIMAL, never round.
--
-- The audit formatted rates as round(rate*100)||'%', so a stored 9.5% recorded
-- (and displayed) as "10%" — which is exactly how Friday's Rightmove agent-rate
-- mis-entry (0.095 instead of 0.10) hid in plain sight. Change the format to
-- to_char(rate*100,'FM990.0')||'%' so 0.095 -> "9.5%" and 0.10 -> "10.0%" and the
-- two can never be confused. Function body otherwise unchanged.
-- =====================================================================
create or replace function public.update_partner_settings(p_slug text, p_name text, p_status text, p_live_from date, p_partner_rate numeric, p_agent_rate numeric)
 returns partners
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

  -- One audit row per changed field (old -> new). Rates recorded to ONE DECIMAL
  -- (never rounded to whole %) so 9.5% can never be mistaken for 10%.
  if cur.partner_rate is distinct from p_partner_rate then
    insert into public.partner_audit(partner_id, field, old_value, new_value, actor)
    values (cur.id, 'partner_rate', to_char(cur.partner_rate*100, 'FM990.0') || '%', to_char(p_partner_rate*100, 'FM990.0') || '%', who);
  end if;
  if cur.agent_rate is distinct from p_agent_rate then
    insert into public.partner_audit(partner_id, field, old_value, new_value, actor)
    values (cur.id, 'agent_rate', to_char(cur.agent_rate*100, 'FM990.0') || '%', to_char(p_agent_rate*100, 'FM990.0') || '%', who);
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
