-- Enforce the approved one-active-support-ticket-per-Telegram-user rule under concurrency.
-- A user may open a new ticket after the previous ticket is closed.
create unique index if not exists bot_support_one_active_ticket_per_user_uidx
  on public.bot_support_tickets (telegram_id)
  where status in ('open', 'pending');
