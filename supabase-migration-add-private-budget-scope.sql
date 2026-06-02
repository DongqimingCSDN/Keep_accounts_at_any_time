-- 私密账单 & 预算作用域 迁移
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 1. transactions 表添加 is_private 字段
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 2. budgets 表添加 scope 和 family_id 字段
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'personal' CHECK (scope IN ('personal', 'family'));
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

-- 3. 将现有家庭预算的 scope 更新为 family
UPDATE budgets SET scope = 'family', family_id = (
  SELECT family_id FROM transactions WHERE transactions.family_id IS NOT NULL LIMIT 1
) WHERE family_id IS NULL AND scope = 'personal';

-- 4. 更新 budgets 的唯一约束（加入 scope）
DROP INDEX IF EXISTS budgets_family_id_month_category_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS budgets_family_scope_month_category_key
  ON budgets(family_id, scope, month, category_id);

-- 5. 为私密账单添加索引
CREATE INDEX IF NOT EXISTS idx_transactions_private ON transactions(user_id, is_private) WHERE is_private = true;
