import os
import shutil
import glob
import subprocess
import sys

print("=== 1. Validating JavaScript Syntax ===")
files = glob.glob('public/js/*.js') + glob.glob('public/js/**/*.js')
has_error = False

for f in sorted(files):
    res = subprocess.run(['node', '--check', f], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"❌ Syntax Error in {f}:\n{res.stderr}")
        has_error = True
    else:
        print(f"  ✓ {f}")

if has_error:
    print("Aborting sync due to syntax errors.")
    sys.exit(1)

print("\n=== 2. Syncing Assets to dist/ ===")
# Ensure dist exists
os.makedirs('dist', exist_ok=True)

# Copy index.html
shutil.copyfile('index.html', 'dist/index.html')
print("  ✓ index.html -> dist/index.html")

# Copy sw.js
shutil.copyfile('public/sw.js', 'dist/sw.js')
print("  ✓ public/sw.js -> dist/sw.js")

# Copy public/js/ to dist/js/
if os.path.exists('dist/js'):
    shutil.rmtree('dist/js')
shutil.copytree('public/js', 'dist/js')
print("  ✓ public/js/ -> dist/js/")

# Copy any extra root assets if modified
for asset in ['manifest.webmanifest', 'favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png']:
    src = os.path.join('public', asset)
    dst = os.path.join('dist', asset)
    if os.path.exists(src):
        shutil.copyfile(src, dst)

print("\n🎉 Verification & Sync to dist/ completed successfully!")
