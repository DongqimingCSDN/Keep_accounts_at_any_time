-- 个人预算云端存储 迁移
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 1. budgets 表添加 user_id 字段（个人预算关联用户）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE budgets ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. budgets 表添加 category_id 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budgets' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE budgets ADD COLUMN category_id TEXT;
  END IF;
END $$;

-- 3. 更新唯一约束，支持个人预算（user_id + month + category_id）
DROP INDEX IF EXISTS budgets_family_id_month_category_id_key;
DROP INDEX IF EXISTS budgets_family_scope_month_category_key;

CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_month_category_key
  ON budgets(user_id, month, category_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS budgets_family_month_category_key
  ON budgets(family_id, month, category_id)
  WHERE family_id IS NOT NULL;

-- 4. 添加索引
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month) WHERE user_id IS NOT NULL;

-- 5. 更新 RLS 策略，允许用户操作自己的个人预算
DROP POLICY IF EXISTS budgets_select ON budgets;
DROP POLICY IF EXISTS budgets_insert ON budgets;
DROP POLICY IF EXISTS budgets_update ON budgets;
DROP POLICY IF EXISTS budgets_delete ON budgets;
DROP POLICY IF EXISTS "家庭成员可查看预算" ON budgets;
DROP POLICY IF EXISTS "家庭成员可创建预算" ON budgets;
DROP POLICY IF EXISTS "家庭成员可更新预算" ON budgets;
DROP POLICY IF EXISTS "家庭成员可删除预算" ON budgets;

CREATE POLICY budgets_select ON budgets FOR SELECT USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);

CREATE POLICY budgets_insert ON budgets FOR INSERT WITH CHECK (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);

CREATE POLICY budgets_update ON budgets FOR UPDATE USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);

CREATE POLICY budgets_delete ON budgets FOR DELETE USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);

-- 6. 允许 family_id 为空（个人预算不需要 family_id）
-- 确保 budgets 表的 family_id 可以为 NULL（如果之前设置了 NOT NULL）
-- 注意：如果之前已经是 nullable 则此语句不会报错
ALTER TABLE budgets ALTER COLUMN family_id DROP NOT NULL;
