from PIL import Image
import shutil

SRC = r'd:\project\Keep_accounts_at_any_time\assets\icon.png'

icon = Image.open(SRC)
w, h = icon.size
print(f'icon.png: {w}x{h}')

shutil.copy2(SRC, r'd:\project\Keep_accounts_at_any_time\assets\adaptive-icon.png')
print('adaptive-icon.png: 已替换 (1024x1024)')

favicon = icon.resize((48, 48), Image.LANCZOS)
favicon.save(r'd:\project\Keep_accounts_at_any_time\assets\favicon.png', 'PNG')
print('favicon.png: 已替换 (48x48)')

print('全部替换完成!')
