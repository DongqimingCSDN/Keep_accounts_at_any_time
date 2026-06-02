-- 将 transactions 和 auto_transactions 表的 fund_account_id 列从 UUID 改为 TEXT
-- 这样可以存储本地默认资金账户 ID（如 fund_wechat）和 UUID 格式的 ID

-- 1. transactions 表：删除外键约束（如果有），修改列类型
DO $$
BEGIN
  -- 删除可能存在的外键约束
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'transactions'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%fund_account%'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_fund_account_id_fkey;
  END IF;
END $$;

-- 修改 fund_account_id 列类型为 TEXT
ALTER TABLE transactions ALTER COLUMN fund_account_id TYPE TEXT USING fund_account_id::TEXT;

-- 2. auto_transactions 表：删除外键约束（如果有），修改列类型
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'auto_transactions'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%fund_account%'
  ) THEN
    ALTER TABLE auto_transactions DROP CONSTRAINT auto_transactions_fund_account_id_fkey;
  END IF;
END $$;

ALTER TABLE auto_transactions ALTER COLUMN fund_account_id TYPE TEXT USING fund_account_id::TEXT;
