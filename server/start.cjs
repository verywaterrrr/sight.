const {spawnSync}=require('node:child_process');const {existsSync}=require('node:fs');const path=require('node:path');
const bundled=path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3');
const python=process.env.SIGHT_PYTHON||(existsSync(bundled)?bundled:'python3');
const result=spawnSync(python,[path.join(__dirname,'service.py'),...process.argv.slice(2)],{stdio:'inherit'});process.exit(result.status??1);
