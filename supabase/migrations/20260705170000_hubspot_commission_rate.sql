-- =====================================================================
-- #14 HubSpot commission-rate sync
--   (a) Portal-minted companies sync their commission_rate — the agent
--       commission rate (a fraction, e.g. 0.10) applicable to the company's
--       partner. The property already exists on Companies in the Hub.
--   (b) A DORMANT Applicant partner_commission_rate mapping (from the snapshotted
--       applications.partner_rate). The property does NOT exist on the Applicant
--       object yet and the integration token lacks schema-write scope, so the row
--       ships inactive (active=false) and is activated once the property is
--       created at production promotion. See the hubspot-sync README.
-- =====================================================================
insert into public.hubspot_field_map (object, hs_property, source_kind, source, transform, events, active, notes) values
  ('company','commission_rate','derived','commission_rate',null,'{}', true,
   'Agent commission rate (fraction) for the company''s partner — synced on portal-minted companies (#14)'),
  ('applicant','partner_commission_rate','col','partner_rate','number','{referral}', false,
   'DORMANT (#14): the partner_commission_rate property is created at production promotion (sandbox token lacks schema-write); flip active=true then')
on conflict (object, hs_property, source) do update set
  source_kind = excluded.source_kind, transform = excluded.transform,
  events = excluded.events, active = excluded.active, notes = excluded.notes;
