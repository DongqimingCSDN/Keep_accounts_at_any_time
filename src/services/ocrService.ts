/**
 * OCR 服务 — 将图片识别为文本
 * 使用百度 OCR 通用文字识别
 */

export interface OCRResult {
  text: string;
  confidence: number;
  blocks?: {
    text: string;
    confidence: number;
  }[];
}

export const OCR_PROVIDER = {
  name: '百度OCR',
  apiKeyLabel: 'API Key',
  secretKeyLabel: 'Secret Key',
  apiUrl: 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic',
};

const TIMEOUT_MS = 30000;

/**
 * 测试网络连通性（获取百度 Access Token）
 */
export async function testBaiduConnection(apiKey: string, secretKey: string): Promise<string> {
  if (!apiKey || !secretKey) {
    throw new Error('请先填写 API Key 和 Secret Key');
  }

  try {
    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      { method: 'GET' },
    );
    const json = await response.json();
    if (json.error) {
      throw new Error(`认证失败: ${json.error_description || 'API Key 或 Secret Key 无效'}`);
    }
    if (!json.access_token) {
      throw new Error('未获取到 Access Token');
    }
    return json.access_token;
  } catch (err: any) {
    throw new Error(err.message || '网络连接失败');
  }
}

/**
 * 调用百度 OCR 识别图片
 */
export async function recognizeImage(
  imageUri: string,
  apiKey: string,
  secretKey: string,
): Promise<OCRResult> {
  if (!apiKey || !secretKey) {
    throw new Error('请填写完整的 API Key 和 Secret Key');
  }

  console.log('[OCR] Step 1: 读取图片...');
  let base64: string;
  try {
    base64 = await imageToBase64(imageUri);
    console.log(`[OCR] Step 1 完成: base64 长度=${base64.length}`);
  } catch (err: any) {
    console.error('[OCR] Step 1 失败:', err.message);
    throw new Error(`图片读取失败: ${err.message}`);
  }

  if (!base64 || base64.length === 0) {
    throw new Error('图片数据为空，请重新选择图片');
  }

  if (base64.length > 2 * 1024 * 1024) {
    throw new Error('图片太大，请选择较小的截图（建议小于 1MB）');
  }

  console.log('[OCR] Step 2: 获取 Access Token...');
  let accessToken: string;
  try {
    accessToken = await testBaiduConnection(apiKey, secretKey);
    console.log('[OCR] Step 2 完成: token 获取成功');
  } catch (err: any) {
    console.error('[OCR] Step 2 失败:', err.message);
    throw new Error(`百度认证失败: ${err.message}`);
  }

  console.log('[OCR] Step 3: 发送 OCR 识别请求...');
  try {
    const formData = new FormData();
    formData.append('image', base64);
    formData.append('detect_direction', 'true');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `image=${encodeBase64ForForm(base64)}&detect_direction=true`,
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);
    console.log(`[OCR] Step 3: HTTP 状态=${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[OCR] Step 3 失败:', response.status, errText);
      throw new Error(`OCR 服务响应错误 (${response.status})`);
    }

    const json = await response.json();
    console.log('[OCR] Step 3 完成:', JSON.stringify(json).substring(0, 200));

    if (json.error_code) {
      throw new Error(`OCR 错误: ${json.error_msg || '识别失败'} (错误码: ${json.error_code})`);
    }

    const words = json.words_result || [];
    const text = words.map((w: any) => w.words).join('\n');
    const blocks = words.map((w: any) => ({
      text: w.words,
      confidence: w.probability?.average ?? 0.9,
    }));

    return {
      text,
      confidence: blocks.length > 0
        ? blocks.reduce((sum: number, b: any) => sum + b.confidence, 0) / blocks.length
        : 0.9,
      blocks,
    };
  } catch (err: any) {
    console.error('[OCR] Step 3 异常:', err.name, err.message);
    if (err.name === 'AbortError') {
      throw new Error('OCR 请求超时（30秒），请检查网络');
    }
    throw new Error(`OCR 识别失败: ${err.message}`);
  }
}

function encodeBase64ForForm(base64: string): string {
  return base64
    .replace(/\r?\n/g, '')
    .replace(/\+/g, '%2B')
    .replace(/\//g, '%2F')
    .replace(/=/g, '%3D');
}

/**
 * 将图片转为 Base64
 */
async function imageToBase64(imageUri: string): Promise<string> {
  if (imageUri.startsWith('data:')) {
    const commaIndex = imageUri.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('data URI 格式无效');
    }
    const base64Data = imageUri.substring(commaIndex + 1).replace(/\s/g, '');
    if (!base64Data) {
      throw new Error('data URI 中无 base64 数据');
    }
    return base64Data;
  }

  try {
    const FileSystem = require('expo-file-system');
    const info = await FileSystem.getInfoAsync(imageUri);
    console.log(`[OCR] 文件信息: exists=${info.exists}, size=${(info as any).size}`);
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) {
      throw new Error('读取结果为空');
    }
    return base64.replace(/\s/g, '');
  } catch (err: any) {
    throw new Error(`无法读取图片文件 (${err.message})`);
  }
}