-- 如果表已存在，添加 family_id 列
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_transactions' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE auto_transactions ADD COLUMN family_id UUID;
  END IF;
END $$;

-- 如果表不存在，创建完整表
CREATE TABLE IF NOT EXISTS auto_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category_id TEXT NOT NULL,
  note TEXT DEFAULT '',
  fund_account_id UUID,
  family_id UUID,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'monthly',
  enabled BOOLEAN DEFAULT true,
  last_executed_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_auto_transactions_user_id ON auto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_transactions_family_id ON auto_transactions(family_id);

-- RLS
ALTER TABLE auto_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auto_transactions_select ON auto_transactions;
DROP POLICY IF EXISTS auto_transactions_insert ON auto_transactions;
DROP POLICY IF EXISTS auto_transactions_update ON auto_transactions;
DROP POLICY IF EXISTS auto_transactions_delete ON auto_transactions;

CREATE POLICY auto_transactions_select ON auto_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY auto_transactions_insert ON auto_transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY auto_transactions_update ON auto_transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY auto_transactions_delete ON auto_transactions FOR DELETE USING (user_id = auth.uid());
