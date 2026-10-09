const path=require('node:path'),os=require('node:os');
let runtime=process.env.PLAYWRIGHT_MODULE;
if(!runtime){try{runtime=require.resolve('playwright');}catch{runtime=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}}
module.exports=require(runtime);
