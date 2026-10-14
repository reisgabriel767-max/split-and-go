ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_amount INTEGER CHECK (original_amount > 0);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS original_currency TEXT CHECK (original_currency IN ('BRL', 'USD', 'EUR'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0);
UPDATE expenses e SET original_amount = e.amount, original_currency = g.currency FROM groups g WHERE e.group_id = g.id AND e.original_amount IS NULL;
ALTER TABLE expenses ALTER COLUMN original_amount SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN original_currency SET NOT NULL;
