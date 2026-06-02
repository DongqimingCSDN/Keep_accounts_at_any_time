-- ============================================
-- 数据库迁移：修改 transactions.date 列类型以支持时间
-- 执行时间: 2026-05-25
-- 说明：将 date 列从 DATE 改为 TEXT，支持 YYYY-MM-DD HH:mm 格式
--       同时更新相关索引以适配新的数据类型
-- ============================================

-- 1. 先删除依赖 date 列类型的索引
DROP INDEX IF EXISTS idx_transactions_family_date;

-- 2. 将 date 列从 DATE 改为 TEXT（保留已有数据，自动转为文本格式）
ALTER TABLE transactions 
ALTER COLUMN date TYPE TEXT USING date::text;

-- 3. 重建索引（TEXT 类型的 YYYY-MM-DD HH:mm 格式仍可按字典序正确排序）
CREATE INDEX IF NOT EXISTS idx_transactions_family_date 
ON transactions(family_id, date DESC);

-- 4. 验证
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'date';