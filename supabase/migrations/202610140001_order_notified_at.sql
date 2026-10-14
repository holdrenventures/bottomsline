-- Add a nullable timestamp used to make order-notification emails idempotent
-- across Stripe webhook retries. The webhook atomically "claims" the right
-- to send by doing UPDATE ... SET notified_at = now() WHERE notified_at IS NULL
-- RETURNING id. The claim wins exactly once per order even under concurrent
-- webhook deliveries, so customers only ever get one confirmation email.
--
-- Also useful on the fulfillment desk to show whether emails have been sent
-- (though we don't surface it in the UI yet).

begin;

alter table public.orders
  add column if not exists notified_at timestamptz;

commit;
