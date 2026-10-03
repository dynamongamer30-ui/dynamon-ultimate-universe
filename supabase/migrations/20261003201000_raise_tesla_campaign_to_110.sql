-- Raise the existing Tesla Phoenix Pass campaign from 100 to 110 total claims.
update public.claim_campaigns
set max_claims = 110
where slug = 'tesla';
