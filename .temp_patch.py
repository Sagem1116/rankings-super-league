from pathlib import Path
import re

path = Path('src/components/data-table.tsx')
text = path.read_text(encoding='utf-8')
pattern = r'function normalizeLogoName\(name: string\) \{[\s\S]*?\.toLowerCase\(\);\n\}'
replacement = '''function normalizeLogoName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}'''
new_text = re.sub(pattern, replacement, text)
path.write_text(new_text, encoding='utf-8')
print('patched' if new_text != text else 'no change')
