/**
 * LLM 智能解析服务 — 将 OCR 文本解析为结构化交易数据
 * 支持多种 OpenAI 兼容 API（DeepSeek、通义千问、OpenAI 等）
 */

export interface ParsedTransaction {
  type: 'expense' | 'income';
  amount: number;
  categoryName?: string;
  fundAccountName?: string;
  date?: string;      // YYYY-MM-DD
  time?: string;      // HH:mm
  note?: string;
  confidence: {
    type: number;      // 0-1
    amount: number;
    category: number;
    fundAccount: number;
    date: number;
  };
}

export type LLMProvider = 'deepseek' | 'tongyi' | 'openai' | 'custom';

interface LLMProviderConfig {
  name: string;
  apiKeyLabel: string;
  defaultBaseUrl: string;
  defaultModel: string;
}

export const LLM_PROVIDERS: Record<LLMProvider, LLMProviderConfig> = {
  deepseek: {
    name: 'DeepSeek',
    apiKeyLabel: 'DeepSeek API Key',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
  },
  tongyi: {
    name: '通义千问',
    apiKeyLabel: '通义千问 API Key',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
  },
  openai: {
    name: 'OpenAI',
    apiKeyLabel: 'OpenAI API Key',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  custom: {
    name: '自定义',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: '',
    defaultModel: '',
  },
};

function buildSystemPrompt(expenseCategories: string[], incomeCategories: string[], fundAccounts: string[]): string {
  return `你是一个智能记账助手。用户会给你一段从支付/收款截图上OCR识别出的文字，你需要从中提取出结构化的交易信息。

请严格按照以下JSON格式输出，不要输出任何其他内容：
{
  "type": "expense 或 income",
  "amount": 数字金额,
  "categoryName": "分类名称",
  "fundAccountName": "资金账户名称",
  "date": "YYYY-MM-DD格式",
  "time": "HH:mm格式",
  "note": "备注信息，通常为商户名",
  "confidence": {
    "type": 0-1的置信度,
    "amount": 0-1的置信度,
    "category": 0-1的置信度,
    "fundAccount": 0-1的置信度,
    "date": 0-1的置信度
  }
}

支出分类名称请从以下选项中选择最匹配的：
${expenseCategories.join('、')}

收入分类名称请从以下选项中选择最匹配的：
${incomeCategories.join('、')}

资金账户名称请从以下选项中选择：
${fundAccounts.join('、')}

注意事项：
1. 如果无法确定某个字段，confidence 设为 0
2. 金额必须是数字，不带货币符号
3. 如果是支出，type 为 expense；如果是收入，type 为 income
4. 优先根据文字内容判断收支类型（如"付款"、"消费"为支出，"收款"、"到账"为收入）
5. note 字段填写商户名称或交易描述
6. 日期和时间：只有当OCR文本中明确包含日期或时间信息时才填写（如"2024-01-15"、"18:30"、"今天"、"刚才"），如果文本中没有明确的日期时间信息，date和time字段省略，date的confidence设为0
7. 绝对禁止编造日期和时间，宁可留空也不要猜测`;
}

function buildTextBookkeepingPrompt(expenseCategories: string[], incomeCategories: string[], fundAccounts: string[]): string {
  return `你是一个智能记账助手。用户会用自然语言描述消费或收入，可能包含多笔交易，你需要从中提取出所有交易的结构化信息。

请严格按照以下JSON格式输出，不要输出任何其他内容：
[
  {
    "type": "expense 或 income",
    "amount": 数字金额,
    "categoryName": "分类名称",
    "fundAccountName": "资金账户名称",
    "date": "YYYY-MM-DD格式",
    "time": "HH:mm格式",
    "note": "备注信息"
  }
]

注意输出的是一个JSON数组，即使只有一笔交易也要用数组包裹。

支出分类名称请从以下选项中选择最匹配的：
${expenseCategories.join('、')}

收入分类名称请从以下选项中选择最匹配的：
${incomeCategories.join('、')}

资金账户名称请从以下选项中选择最匹配的：
${fundAccounts.join('、')}

注意事项：
1. 金额必须是数字，不带货币符号
2. 如果是支出，type 为 expense；如果是收入，type 为 income
3. 根据描述判断收支类型（如"买了"、"花了"、"付了"为支出，"收到"、"赚了"为收入）
4. note 字段填写交易描述或商户名
5. 日期和时间：只有当用户明确提到时才填写（如"今天午饭"、"昨天打车"），如果用户没有明确提到，date 和 time 省略
6. 绝对禁止编造或猜测日期时间
7. 如果用户没有提到资金账户，fundAccountName 可以省略
8. 用户描述了多笔交易时，必须全部提取出来，每笔交易作为数组中的一个元素
9. 如果多笔交易共用同一个日期或资金账户，每笔交易都要完整填写`;
}

const TIMEOUT_MS = 60000;

/**
 * 带超时的 fetch
 */
async function llmFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('LLM 请求超时（60秒），请检查网络或稍后重试');
    }
    throw new Error(`网络请求失败: ${err.message}`);
  }
}

/**
 * 调用 LLM 解析 OCR 文本
 */
export interface DynamicOptions {
  expenseCategories?: string[];
  incomeCategories?: string[];
  fundAccounts?: string[];
}

export async function parseTransactionFromText(
  ocrText: string,
  provider: LLMProvider,
  apiKey: string,
  customBaseUrl?: string,
  customModel?: string,
  dynamicOptions?: DynamicOptions,
): Promise<ParsedTransaction> {
  const config = LLM_PROVIDERS[provider];
  const baseUrl = customBaseUrl || config.defaultBaseUrl;
  const model = customModel || config.defaultModel;

  if (!apiKey) {
    throw new Error('请先配置 LLM API Key');
  }

  if (!baseUrl) {
    throw new Error('未配置 LLM API 地址');
  }

  console.log('[LLM] 调用解析, provider=${provider}, model=${model}, url=${baseUrl}/chat/completions');

  try {
    const response = await llmFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt(
            dynamicOptions?.expenseCategories ?? ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '通讯', '其他'],
            dynamicOptions?.incomeCategories ?? ['工资', '兼职', '投资', '红包', '其他'],
            dynamicOptions?.fundAccounts ?? ['微信', '支付宝', '现金', '银行卡'],
          ) },
          { role: 'user', content: `请从以下OCR识别文本中提取交易信息：\n\n${ocrText}` },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    console.log(`[LLM] HTTP 状态=${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[LLM] 请求失败:', response.status, errText);
      throw new Error(`LLM 请求失败 (${response.status}): ${errText.substring(0, 200)}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[LLM] 返回内容为空:', JSON.stringify(json).substring(0, 300));
      throw new Error('LLM 返回内容为空');
    }

    console.log('[LLM] 原始返回:', content.substring(0, 200));

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从 LLM 返回中提取 JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      type: parsed.type === 'income' ? 'income' : 'expense',
      amount: typeof parsed.amount === 'number' ? parsed.amount : 0,
      categoryName: parsed.categoryName || undefined,
      fundAccountName: parsed.fundAccountName || undefined,
      date: parsed.date || undefined,
      time: parsed.time || undefined,
      note: parsed.note || undefined,
      confidence: {
        type: parsed.confidence?.type ?? 0.5,
        amount: parsed.confidence?.amount ?? 0.5,
        category: parsed.confidence?.category ?? 0.3,
        fundAccount: parsed.confidence?.fundAccount ?? 0.3,
        date: parsed.confidence?.date ?? 0.5,
      },
    };
  } catch (err: any) {
    console.error('[LLM] 异常:', err.name, err.message);
    throw err;
  }
}

/**
 * 调用 LLM 解析自然语言记账文本
 */
export async function parseTextBookkeeping(
  text: string,
  provider: LLMProvider,
  apiKey: string,
  customBaseUrl?: string,
  customModel?: string,
  dynamicOptions?: DynamicOptions,
): Promise<ParsedTransaction[]> {
  const config = LLM_PROVIDERS[provider];
  const baseUrl = customBaseUrl || config.defaultBaseUrl;
  const model = customModel || config.defaultModel;

  if (!apiKey) {
    throw new Error('请先配置 LLM API Key');
  }

  if (!baseUrl) {
    throw new Error('未配置 LLM API 地址');
  }

  console.log('[LLM] 文字记账解析, provider=${provider}, model=${model}');

  try {
    const response = await llmFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildTextBookkeepingPrompt(
            dynamicOptions?.expenseCategories ?? ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '通讯', '其他'],
            dynamicOptions?.incomeCategories ?? ['工资', '兼职', '投资', '红包', '其他'],
            dynamicOptions?.fundAccounts ?? ['微信', '支付宝', '现金', '银行卡'],
          ) },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    console.log(`[LLM] HTTP 状态=${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[LLM] 请求失败:', response.status, errText);
      throw new Error(`LLM 请求失败 (${response.status}): ${errText.substring(0, 200)}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[LLM] 返回内容为空:', JSON.stringify(json).substring(0, 300));
      throw new Error('LLM 返回内容为空');
    }

    console.log('[LLM] 原始返回:', content.substring(0, 300));

    const arrayMatch = content.match(/\[[\s\S]*\]/);
    const objectMatch = content.match(/\{[\s\S]*\}/);

    let parsedItems: any[];

    if (arrayMatch) {
      parsedItems = JSON.parse(arrayMatch[0]);
    } else if (objectMatch) {
      parsedItems = [JSON.parse(objectMatch[0])];
    } else {
      throw new Error('无法从 LLM 返回中提取 JSON');
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      throw new Error('LLM 返回格式异常');
    }

    return parsedItems.map((parsed: any) => ({
      type: parsed.type === 'income' ? 'income' : 'expense',
      amount: typeof parsed.amount === 'number' ? parsed.amount : 0,
      categoryName: parsed.categoryName || undefined,
      fundAccountName: parsed.fundAccountName || undefined,
      date: parsed.date || undefined,
      time: parsed.time || undefined,
      note: parsed.note || undefined,
      confidence: {
        type: parsed.confidence?.type ?? 0.8,
        amount: parsed.confidence?.amount ?? 0.8,
        category: parsed.confidence?.category ?? 0.6,
        fundAccount: parsed.confidence?.fundAccount ?? 0.5,
        date: parsed.confidence?.date ?? 0.7,
      },
    }));
  } catch (err: any) {
    console.error('[LLM] 异常:', err.name, err.message);
    throw err;
  }
}