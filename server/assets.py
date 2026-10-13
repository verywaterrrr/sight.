"""Give every frontend module in a release the same cache-busting version."""
import hashlib,re
from pathlib import Path
PATTERN=re.compile(r"([\"'])((?:\.\.?/)?[A-Za-z0-9_./-]+\.(?:m?js|css))\1")
def asset_version(root):
    root=Path(root);digest=hashlib.sha256()
    files=list(root.glob('*.js'))+[root/'styles.css',root/'index.html']+list((root/'vendor').glob('*.mjs'))
    for file in sorted(files,key=lambda p:p.relative_to(root).as_posix()):
        digest.update((file.relative_to(root).as_posix()+'\0').encode());digest.update(file.read_bytes())
    return digest.hexdigest()[:16]
def version_asset(text,version):
    return PATTERN.sub(lambda m:f'{m[1]}{m[2]}?v={version}{m[1]}',text)
