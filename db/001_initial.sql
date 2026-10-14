CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  currency TEXT NOT NULL CHECK (currency IN ('BRL', 'USD', 'EUR')),
  category TEXT NOT NULL CHECK (category IN ('trip', 'home', 'event')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (group_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS members_unique_name ON members (group_id, lower(name));

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 120),
  amount INTEGER NOT NULL CHECK (amount > 0),
  spent_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (group_id, id),
  FOREIGN KEY (group_id, payer_id) REFERENCES members(group_id, id)
);

CREATE TABLE IF NOT EXISTS expense_shares (
  expense_id UUID NOT NULL,
  group_id UUID NOT NULL,
  member_id UUID NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  PRIMARY KEY (expense_id, member_id),
  FOREIGN KEY (group_id, expense_id) REFERENCES expenses(group_id, id) ON DELETE CASCADE,
  FOREIGN KEY (group_id, member_id) REFERENCES members(group_id, id)
);
CREATE INDEX IF NOT EXISTS expenses_group ON expenses(group_id, spent_on DESC);
