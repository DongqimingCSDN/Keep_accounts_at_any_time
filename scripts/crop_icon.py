from PIL import Image
import numpy as np

SRC = r'd:\project\Keep_accounts_at_any_time\assets\icon.png'
DST = r'd:\project\Keep_accounts_at_any_time\assets\icon.png'

img = Image.open(SRC).convert('RGBA')
w, h = img.size
print(f'原始尺寸: {w}x{h}')

arr = np.array(img).astype(float)
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
brightness = (r + g + b) / 3.0

max_rgb = np.maximum(np.maximum(r, g), b)
min_rgb = np.minimum(np.minimum(r, g), b)
saturation = np.where(max_rgb > 0, (max_rgb - min_rgb) / max_rgb, 0)

# 对勾候选（高亮低饱和）
checkmark = (brightness > 245) & (saturation < 0.05)

if checkmark.sum() == 0:
    print('未找到对勾')
    exit(1)

ys, xs = np.where(checkmark)

# 用滑动窗口计算密度，找到最密集的区域（对勾主体）
window = 80
density = np.zeros((h, w))
for y_val, x_val in zip(ys, xs):
    y0 = max(0, y_val - window)
    y1 = min(h, y_val + window)
    x0 = max(0, x_val - window)
    x1 = min(w, x_val + window)
    density[y0:y1, x0:x1] += 1

# 密度最高的区域就是对勾中心
flat_idx = np.argmax(density)
cy_best, cx_best = np.unravel_index(flat_idx, density.shape)
print(f'对勾密度中心: ({cx_best}, {cy_best})')

# 以对勾中心为基准，向四周扩展到包含所有主要内容
# 使用加权质心（密度加权）来更精确地定位内容中心
total_mass = density.sum()
cx_weighted = np.sum(density * np.arange(w)[np.newaxis, :]) / total_mass
cy_weighted = np.sum(density * np.arange(h)[:, np.newaxis]) / total_mass
print(f'加权质心: ({cx_weighted:.0f}, {cy_weighted:.0f})')

# 基于视觉分析，钱包+对勾大约占画面的75%，偏右下
# 用质心作为新中心，取正方形裁剪
center_x = cx_weighted
center_y = cy_weighted

# 裁剪尺寸：让内容居中，保留适当边距
crop_size = int(min(w, h) * 0.92)
half = crop_size / 2

left = int(round(center_x - half))
top = int(round(center_y - half))
right = int(round(center_x + half))
bottom = int(round(center_y + half))

left = max(0, left)
top = max(0, top)
right = min(w, right)
bottom = min(h, bottom)

cropped = img.crop((left, top, right, bottom))
cw, ch = cropped.size
print(f'裁剪区域: ({left},{top})->({right},{bottom}), 尺寸: {cw}x{ch}')

TARGET = 1024
final = cropped.resize((TARGET, TARGET), Image.LANCZOS)
final.save(DST, 'PNG')
print(f'已保存: {DST} ({TARGET}x{TARGET})')

prev = cropped.resize((256, 256), Image.LANCZOS)
prev.save(r'd:\project\Keep_accounts_at_any_time\assets\icon_preview.png', 'PNG')
print('预览图已保存')
