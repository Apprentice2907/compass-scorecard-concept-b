"""Builds the Chartwells-branded copy of Concept B (quiz + report) into a separate deploy folder.
Usage: python build_chartwells.py <concept-b dir> <out dir>"""
import sys, shutil, os
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in ('index.html', 'cafe3d.js', 'quiz-data.js', 'CREDITS.md'):
    shutil.copy2(os.path.join(src, f), os.path.join(out, f))
for d in ('img',):
    shutil.copytree(os.path.join(src, d), os.path.join(out, d), dirs_exist_ok=True)
os.makedirs(os.path.join(out, 'report', 'img'), exist_ok=True)
shutil.copy2(os.path.join(src, 'report', 'sample-report.html'), os.path.join(out, 'report', 'sample-report.html'))
shutil.copytree(os.path.join(src, 'report', 'img'), os.path.join(out, 'report', 'img'), dirs_exist_ok=True)
open(os.path.join(out, '.vercelignore'), 'w').write('.env*\n.vercel\n')
open(os.path.join(out, '.gitignore'), 'w').write('.vercel\n.env*\n')

# quiz: Chartwells theme by default
p = os.path.join(out, 'index.html')
s = open(p, encoding='utf8').read()
a = "(/^\\/chartwells/.test(location.pathname) || QS.get('brand') === 'chartwells' ? 'cw' : '1')"
assert s.count(a) == 1
s = s.replace(a, "'cw'")
s = s.replace('<base href="/">\n', '')
open(p, 'w', encoding='utf8', newline='').write(s)

# report: the Chartwells look is built into report/sample-report.html (19 Nov)
# blurred report preview thumbnails from the Chartwells PDF (if already printed)
pdf = os.path.join(out, 'report', 'Chartwells-Sample-Scorecard.pdf')
if os.path.exists(pdf):
    import pymupdf
    from PIL import Image
    d = pymupdf.open(pdf)
    for i in range(3):
        pm = d[i].get_pixmap(dpi=60)
        im = Image.frombytes('RGB', (pm.width, pm.height), pm.samples); im.thumbnail((300, 430))
        im.save(os.path.join(out, 'img', 'report-peek-%d.jpg' % (i + 1)), quality=82)
print('built', out)
