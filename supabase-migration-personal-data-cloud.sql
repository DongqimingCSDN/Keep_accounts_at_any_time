-- 迁移个人交易、个人分类、用户设置到 Supabase
-- 1. categories 表添加 user_id 字段（个人分类关联用户）
-- 2. 创建 user_settings 表
-- 3. 更新 RLS 策略

-- ============================================
-- 1. categories 表添加 user_id 字段
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 允许 family_id 或 user_id 为空（个人分类只有 user_id，家庭分类只有 family_id）
ALTER TABLE categories ALTER COLUMN family_id DROP NOT NULL;

-- 更新 RLS 策略
DROP POLICY IF EXISTS categories_select ON categories;
DROP POLICY IF EXISTS categories_insert ON categories;
DROP POLICY IF EXISTS categories_update ON categories;
DROP POLICY IF EXISTS categories_delete ON categories;

CREATE POLICY categories_select ON categories FOR SELECT USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);
CREATE POLICY categories_insert ON categories FOR INSERT WITH CHECK (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);
CREATE POLICY categories_update ON categories FOR UPDATE USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);
CREATE POLICY categories_delete ON categories FOR DELETE USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);

-- ============================================
-- 2. 个人交易：允许 transactions 表的 family_id 为空
-- ============================================
ALTER TABLE transactions ALTER COLUMN family_id DROP NOT NULL;

-- 更新 RLS 策略，允许用户查看自己的个人交易（family_id 为空且 user_id 匹配）
DROP POLICY IF EXISTS transactions_select ON transactions;
DROP POLICY IF EXISTS transactions_insert ON transactions;
DROP POLICY IF EXISTS transactions_update ON transactions;
DROP POLICY IF EXISTS transactions_delete ON transactions;

CREATE POLICY transactions_select ON transactions FOR SELECT USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);
CREATE POLICY transactions_insert ON transactions FOR INSERT WITH CHECK (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);
CREATE POLICY transactions_update ON transactions FOR UPDATE USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);
CREATE POLICY transactions_delete ON transactions FOR DELETE USING (
  (user_id = auth.uid())
  OR
  (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()))
);

-- ============================================
-- 3. 创建 user_settings 表
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  currency TEXT NOT NULL DEFAULT 'CNY',
  theme TEXT NOT NULL DEFAULT 'system',
  show_assistant BOOLEAN DEFAULT false,
  llm_provider TEXT,
  llm_api_key TEXT,
  llm_base_url TEXT,
  llm_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_settings_select ON user_settings;
DROP POLICY IF EXISTS user_settings_insert ON user_settings;
DROP POLICY IF EXISTS user_settings_update ON user_settings;
DROP POLICY IF EXISTS user_settings_delete ON user_settings;

CREATE POLICY user_settings_select ON user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_settings_insert ON user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_settings_update ON user_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY user_settings_delete ON user_settings FOR DELETE USING (user_id = auth.uid());
