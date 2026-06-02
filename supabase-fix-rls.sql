-- ============================================
-- 修复 RLS 循环引用问题
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 创建辅助函数（放在 public schema，SECURITY DEFINER 绕过 RLS）
CREATE OR REPLACE FUNCTION public.user_family_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid();
$$;

-- 2. 删除旧的有问题的策略
DROP POLICY IF EXISTS "家庭成员可查看家庭" ON families;
DROP POLICY IF EXISTS "任何认证用户可创建家庭" ON families;
DROP POLICY IF EXISTS "家庭创建者可更新家庭" ON families;
DROP POLICY IF EXISTS "家庭创建者可删除家庭" ON families;

DROP POLICY IF EXISTS "家庭成员可查看成员列表" ON family_members;
DROP POLICY IF EXISTS "家庭成员可加入" ON family_members;
DROP POLICY IF EXISTS "owner可移除成员" ON family_members;

DROP POLICY IF EXISTS "家庭成员可查看分类" ON categories;
DROP POLICY IF EXISTS "家庭成员可创建分类" ON categories;
DROP POLICY IF EXISTS "家庭成员可更新分类" ON categories;
DROP POLICY IF EXISTS "家庭成员可删除分类" ON categories;

DROP POLICY IF EXISTS "家庭成员可查看交易" ON transactions;
DROP POLICY IF EXISTS "家庭成员可创建交易" ON transactions;
DROP POLICY IF EXISTS "家庭成员可更新交易" ON transactions;
DROP POLICY IF EXISTS "家庭成员可删除交易" ON transactions;

DROP POLICY IF EXISTS "家庭成员可查看预算" ON budgets;
DROP POLICY IF EXISTS "家庭成员可创建预算" ON budgets;
DROP POLICY IF EXISTS "家庭成员可更新预算" ON budgets;
DROP POLICY IF EXISTS "家庭成员可删除预算" ON budgets;

-- 3. 重新创建策略（使用辅助函数）

-- families 策略
CREATE POLICY "家庭成员可查看家庭" ON families
  FOR SELECT USING (
    id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "任何认证用户可创建家庭" ON families
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "家庭创建者可更新家庭" ON families
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "家庭创建者可删除家庭" ON families
  FOR DELETE USING (created_by = auth.uid());

-- family_members 策略
CREATE POLICY "家庭成员可查看成员列表" ON family_members
  FOR SELECT USING (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可加入" ON family_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner可移除成员" ON family_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_family_ids() AS uf WHERE uf = family_members.family_id)
    AND user_id != auth.uid()
  );

-- categories 策略
CREATE POLICY "家庭成员可查看分类" ON categories
  FOR SELECT USING (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可创建分类" ON categories
  FOR INSERT WITH CHECK (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可更新分类" ON categories
  FOR UPDATE USING (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可删除分类" ON categories
  FOR DELETE USING (
    family_id IN (SELECT public.user_family_ids())
  );

-- transactions 策略
CREATE POLICY "家庭成员可查看交易" ON transactions
  FOR SELECT USING (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可创建交易" ON transactions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可更新交易" ON transactions
  FOR UPDATE USING (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可删除交易" ON transactions
  FOR DELETE USING (
    family_id IN (SELECT public.user_family_ids())
  );

-- budgets 策略
CREATE POLICY "家庭成员可查看预算" ON budgets
  FOR SELECT USING (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可创建预算" ON budgets
  FOR INSERT WITH CHECK (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可更新预算" ON budgets
  FOR UPDATE USING (
    family_id IN (SELECT public.user_family_ids())
  );

CREATE POLICY "家庭成员可删除预算" ON budgets
  FOR DELETE USING (
    family_id IN (SELECT public.user_family_ids())
  );
