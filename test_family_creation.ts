// 测试脚本：验证家庭创建功能
import { createFamily } from './src/services/familyService';

async function testCreateFamily() {
  try {
    console.log('开始测试创建家庭...');
    const family = await createFamily('测试家庭');
    console.log('家庭创建成功:', family);
  } catch (error) {
    console.error('家庭创建失败:', error);
  }
}

// 如果在 Node.js 环境中运行
if (typeof window === 'undefined') {
  testCreateFamily();
}