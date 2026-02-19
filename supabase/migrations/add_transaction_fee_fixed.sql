-- Add fixed transaction fee to platform settings
-- This complements the existing transaction_fee_percent

insert into platform_settings (key, value, category, label, description) values
  ('transaction_fee_fixed', '1', 'financial', 'Transaction Fee (GH₵ Flat)', 'Flat fee added to each sale on top of percentage')
on conflict (key) do update set 
  label = excluded.label,
  description = excluded.description;
