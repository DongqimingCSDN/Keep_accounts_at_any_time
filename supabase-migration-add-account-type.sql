-- ============================================
-- 数据库迁移：添加 account_type 字段到 transactions 表
-- 执行时间: 2026-05-25
-- 说明：支持个人/家庭双模式记账功能
-- ============================================

-- 1. 添加 account_type 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'account_type'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN account_type TEXT NOT NULL DEFAULT 'personal' 
        CHECK (account_type IN ('personal', 'family'));
        
        RAISE NOTICE '✅ 成功添加 account_type 字段';
    ELSE
        RAISE NOTICE 'ℹ️  account_type 字段已存在，跳过';
    END IF;
END $$;

-- 2. 更新现有数据（将所有现有记录标记为家庭记账）
UPDATE transactions 
SET account_type = 'family' 
WHERE account_type IS NULL OR account_type = '';

-- 3. 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_transactions_account_type 
ON transactions(account_type);

-- 4. 验证字段是否添加成功
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name = 'account_type';