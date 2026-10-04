"""Flatten an OpenStax CNXML module to the plain text used for evidence checks.
MathML is kept as its characters with no spaces, between ⟦ ⟧ (e.g. ⟦w=mg.⟧).
Usage: python3 openstax_text.py <bundle-dir> <module-id>"""
import html, re, sys

def flatten(cnxml: str) -> str:
    def flat(m):
        x = re.sub(r'<[^>]+>', '', m.group(0))
        return ' ⟦' + re.sub(r'\s+', '', x) + '⟧ '
    s = re.sub(r'<m:math.*?</m:math>', flat, cnxml, flags=re.S)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(html.unescape(s))).strip()

def module_text(bundle_dir: str, module: str) -> str:
    with open(f'{bundle_dir}/modules/{module}/index.cnxml', encoding='utf-8') as f:
        return flatten(f.read())

if __name__ == '__main__':
    print(module_text(sys.argv[1], sys.argv[2]))
