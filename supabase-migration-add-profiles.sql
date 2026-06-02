-- ============================================
-- 用户资料表迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 创建用户资料表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar TEXT DEFAULT '',
  email TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS 策略
-- 任何人可查看资料（家庭成员需要看到彼此的头像和昵称）
CREATE POLICY "资料公开可读" ON profiles
  FOR SELECT USING (true);

-- 用户只能更新自己的资料
CREATE POLICY "用户可更新自己的资料" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 用户只能插入自己的资料
CREATE POLICY "用户可创建自己的资料" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. 自动创建资料记录的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建触发器：新用户注册时自动创建资料
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. 为已有用户创建资料记录
INSERT INTO profiles (id, display_name, email)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  u.email
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 6. 索引
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
