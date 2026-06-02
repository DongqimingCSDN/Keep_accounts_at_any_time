-- ============================================
-- 数据库迁移：fund_accounts 表从 family_id 改为 user_id
-- 说明：资金账户是个人数据，每个用户独立管理自己的账户
-- ============================================

-- 1. 添加 user_id 列
ALTER TABLE fund_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. 为已有数据填充 user_id（取该账户所属家庭中第一个成员的 user_id）
UPDATE fund_accounts fa
SET user_id = (
    SELECT fm.user_id FROM family_members fm
    WHERE fm.family_id = fa.family_id
    ORDER BY fm.joined_at ASC
    LIMIT 1
)
WHERE user_id IS NULL;

-- 3. 将 user_id 设为 NOT NULL（确保所有记录都有 user_id）
-- 注意：如果存在无法匹配 user_id 的记录，先删除它们
DELETE FROM fund_accounts WHERE user_id IS NULL;

ALTER TABLE fund_accounts ALTER COLUMN user_id SET NOT NULL;

-- 4. 将 family_id 改为可空（保留兼容，但不再用于查询）
ALTER TABLE fund_accounts ALTER COLUMN family_id DROP NOT NULL;

-- 5. 添加 user_id 索引
CREATE INDEX IF NOT EXISTS idx_fund_accounts_user_id ON fund_accounts(user_id);

-- 6. 删除旧的 RLS 策略
DROP POLICY IF EXISTS fund_accounts_select ON fund_accounts;
DROP POLICY IF EXISTS fund_accounts_insert ON fund_accounts;
DROP POLICY IF EXISTS fund_accounts_update ON fund_accounts;
DROP POLICY IF EXISTS fund_accounts_delete ON fund_accounts;

-- 7. 创建新的 RLS 策略（基于 user_id）
CREATE POLICY fund_accounts_select ON fund_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY fund_accounts_insert ON fund_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY fund_accounts_update ON fund_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY fund_accounts_delete ON fund_accounts FOR DELETE USING (user_id = auth.uid());
