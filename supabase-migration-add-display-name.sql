-- ============================================
-- 数据库迁移：添加 display_name 字段到 family_members 表
-- 说明：支持家庭成员备注名称功能
-- ============================================

-- 1. 添加 display_name 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'family_members' 
        AND column_name = 'display_name'
    ) THEN
        ALTER TABLE family_members 
        ADD COLUMN display_name TEXT;
        
        RAISE NOTICE '成功添加 display_name 字段';
    ELSE
        RAISE NOTICE 'display_name 字段已存在，跳过';
    END IF;
END $$;

-- 2. 添加 RLS 策略：允许 owner 更新成员信息（备注名称）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'family_members' 
        AND policyname = '家庭创建者可管理成员'
    ) THEN
        CREATE POLICY "家庭创建者可管理成员" ON family_members
          FOR UPDATE USING (
            family_id IN (
              SELECT f.id FROM families f 
              WHERE f.created_by = auth.uid()
            )
          );
    END IF;
END $$;

-- 3. 添加 RLS 策略：允许 owner 删除成员
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'family_members' 
        AND policyname = '家庭创建者可删除成员'
    ) THEN
        CREATE POLICY "家庭创建者可删除成员" ON family_members
          FOR DELETE USING (
            family_id IN (
              SELECT f.id FROM families f 
              WHERE f.created_by = auth.uid()
            )
          );
    END IF;
END $$;

-- 4. 验证字段是否添加成功
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'family_members' 
AND column_name = 'display_name';
