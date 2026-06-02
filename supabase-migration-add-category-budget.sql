-- ============================================
-- 数据库迁移：预算表添加 category_id 字段
-- 说明：支持按分类设置预算金额
-- ============================================

-- 1. 添加 category_id 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'budgets' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE budgets 
        ADD COLUMN category_id TEXT;
        
        RAISE NOTICE '成功添加 category_id 字段';
    ELSE
        RAISE NOTICE 'category_id 字段已存在，跳过';
    END IF;
END $$;

-- 2. 删除旧的单约束，添加新的唯一约束（family_id + month + category_id）
-- 先删除旧约束
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'budgets'
    AND con.conkey = (
        SELECT array_agg(at.attnum)
        FROM pg_attribute at
        JOIN pg_class cl ON cl.oid = at.attrelid
        WHERE cl.relname = 'budgets'
        AND at.attname IN ('family_id', 'month')
    )
    AND contype = 'u';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE budgets DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE '已删除旧唯一约束: %', constraint_name;
    END IF;
END $$;

-- 添加新唯一约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'budgets_family_month_category_unique'
    ) THEN
        ALTER TABLE budgets 
        ADD CONSTRAINT budgets_family_month_category_unique 
        UNIQUE (family_id, month, category_id);
        
        RAISE NOTICE '已添加新唯一约束';
    END IF;
END $$;

-- 3. 更新索引
DROP INDEX IF EXISTS idx_budgets_family_month;
CREATE INDEX IF NOT EXISTS idx_budgets_family_month_category ON budgets(family_id, month, category_id);

-- 4. 验证
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'budgets'
ORDER BY ordinal_position;
