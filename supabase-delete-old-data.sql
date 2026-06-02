-- 删除 2026年6月1日之前的数据
-- 注意：此操作不可恢复，请谨慎执行！

-- ============================================
-- 1. 删除旧交易记录（transactions）
-- ============================================
DELETE FROM transactions
WHERE date < '2026-06-01';

-- ============================================
-- 2. 删除旧预算（budgets）
-- ============================================
DELETE FROM budgets
WHERE month < '2026-06';

-- ============================================
-- 3. 删除旧自动记账规则执行记录（可选）
-- ============================================
-- 如果想保留自动记账规则本身，只清理执行日期记录：
UPDATE auto_transactions
SET last_executed_date = NULL
WHERE last_executed_date < '2026-06-01';

-- 如果想删除整个旧规则（谨慎）：
-- DELETE FROM auto_transactions
-- WHERE created_at < '2026-06-01';

-- ============================================
-- 查看删除后的数据统计
-- ============================================
SELECT 'transactions' as table_name, COUNT(*) as remaining_count FROM transactions
UNION ALL
SELECT 'budgets', COUNT(*) FROM budgets
UNION ALL
SELECT 'auto_transactions', COUNT(*) FROM auto_transactions
UNION ALL
SELECT 'fund_accounts', COUNT(*) FROM fund_accounts
UNION ALL
SELECT 'categories', COUNT(*) FROM categories;