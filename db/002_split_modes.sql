ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_mode TEXT NOT NULL DEFAULT 'equal' CHECK (split_mode IN ('equal', 'percentage', 'fixed'));
ALTER TABLE expense_shares ADD COLUMN IF NOT EXISTS percentage INTEGER CHECK (percentage BETWEEN 0 AND 10000);
