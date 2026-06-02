-- 将 transactions 表的 date 列从 DATE 类型改为 TIMESTAMP 类型
-- 这样可以存储完整的日期和时间信息

-- 1. 先添加新的 timestamp 列
ALTER TABLE transactions ADD COLUMN date_new TIMESTAMP;

-- 2. 将现有 date 数据迁移到新列（设置时间为中午12点）
UPDATE transactions SET date_new = date + INTERVAL '12 hours';

-- 3. 删除旧的 date 列
ALTER TABLE transactions DROP COLUMN date;

-- 4. 重命名新列为 date
ALTER TABLE transactions RENAME COLUMN date_new TO date;

-- 5. 更新 RLS 策略（如果需要）
-- 策略应该不需要改变，因为只是数据类型变化