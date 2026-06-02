-- ============================================
-- 数据库迁移：添加 fund_accounts 表和 fund_account_id 字段
-- 执行时间: 2026-05-25
-- 说明：支持资金账户管理功能（微信、支付宝、银行卡等）
-- ============================================

-- 1. 创建 fund_accounts 表
CREATE TABLE IF NOT EXISTS fund_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '💰',
    color TEXT NOT NULL DEFAULT '#636E72',
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 添加索引
CREATE INDEX IF NOT EXISTS idx_fund_accounts_family_id ON fund_accounts(family_id);

-- 3. 启用 RLS
ALTER TABLE fund_accounts ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略：家庭成员可以查看和管理资金账户
DO $$
BEGIN
    -- 查看策略
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fund_accounts' AND policyname = 'fund_accounts_select'
    ) THEN
        EXECUTE 'CREATE POLICY fund_accounts_select ON fund_accounts FOR SELECT USING (
            family_id IN (
                SELECT f.id FROM families f
                INNER JOIN family_members fm ON fm.family_id = f.id
                WHERE fm.user_id = auth.uid()
            )
        )';
    END IF;

    -- 插入策略
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fund_accounts' AND policyname = 'fund_accounts_insert'
    ) THEN
        EXECUTE 'CREATE POLICY fund_accounts_insert ON fund_accounts FOR INSERT WITH CHECK (
            family_id IN (
                SELECT f.id FROM families f
                INNER JOIN family_members fm ON fm.family_id = f.id
                WHERE fm.user_id = auth.uid()
            )
        )';
    END IF;

    -- 更新策略
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fund_accounts' AND policyname = 'fund_accounts_update'
    ) THEN
        EXECUTE 'CREATE POLICY fund_accounts_update ON fund_accounts FOR UPDATE USING (
            family_id IN (
                SELECT f.id FROM families f
                INNER JOIN family_members fm ON fm.family_id = f.id
                WHERE fm.user_id = auth.uid()
            )
        )';
    END IF;

    -- 删除策略
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'fund_accounts' AND policyname = 'fund_accounts_delete'
    ) THEN
        EXECUTE 'CREATE POLICY fund_accounts_delete ON fund_accounts FOR DELETE USING (
            family_id IN (
                SELECT f.id FROM families f
                INNER JOIN family_members fm ON fm.family_id = f.id
                WHERE fm.user_id = auth.uid()
            )
        )';
    END IF;
END $$;

-- 5. 为 transactions 表添加 fund_account_id 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'fund_account_id'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN fund_account_id UUID REFERENCES fund_accounts(id) ON DELETE SET NULL;
        
        RAISE NOTICE '✅ 成功添加 fund_account_id 字段到 transactions 表';
    ELSE
        RAISE NOTICE 'ℹ️  fund_account_id 字段已存在，跳过';
    END IF;
END $$;

-- 6. 为 transactions.fund_account_id 添加索引
CREATE INDEX IF NOT EXISTS idx_transactions_fund_account_id 
ON transactions(fund_account_id);

-- 7. 为现有家庭自动创建默认资金账户
INSERT INTO fund_accounts (family_id, name, icon, color, balance, "order", is_default)
SELECT f.id, '微信', '💬', '#07C160', 0, 0, true
FROM families f
WHERE NOT EXISTS (
    SELECT 1 FROM fund_accounts fa WHERE fa.family_id = f.id AND fa.name = '微信'
);

INSERT INTO fund_accounts (family_id, name, icon, color, balance, "order", is_default)
SELECT f.id, '支付宝', '🔵', '#1677FF', 0, 1, true
FROM families f
WHERE NOT EXISTS (
    SELECT 1 FROM fund_accounts fa WHERE fa.family_id = f.id AND fa.name = '支付宝'
);

INSERT INTO fund_accounts (family_id, name, icon, color, balance, "order", is_default)
SELECT f.id, '现金', '💵', '#F5A623', 0, 2, true
FROM families f
WHERE NOT EXISTS (
    SELECT 1 FROM fund_accounts fa WHERE fa.family_id = f.id AND fa.name = '现金'
);

INSERT INTO fund_accounts (family_id, name, icon, color, balance, "order", is_default)
SELECT f.id, '银行卡', '🏦', '#6C5CE7', 0, 3, true
FROM families f
WHERE NOT EXISTS (
    SELECT 1 FROM fund_accounts fa WHERE fa.family_id = f.id AND fa.name = '银行卡'
);

-- 8. 验证
SELECT 'fund_accounts 表' AS "对象", COUNT(*) AS "记录数" FROM fund_accounts
UNION ALL
SELECT 'transactions.fund_account_id', COUNT(*) FROM transactions WHERE fund_account_id IS NOT NULL;
