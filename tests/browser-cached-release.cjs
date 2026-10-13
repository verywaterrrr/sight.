const {chromium}=require('./browser-runtime.cjs');const {execFileSync}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const page=await browser.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 // Simulate a long-lived browser cache serving the pre-Mix application at its old URL.
 const old=execFileSync('git',['show','0a7f383:app.js'],{encoding:'utf8'});
 await page.route('**/app.js',route=>route.fulfill({contentType:'text/javascript',body:old,headers:{'Cache-Control':'max-age=31536000'}}));
 await page.goto(process.env.SIGHT_TEST_URL||'http://localhost:5231/');await page.waitForLoadState('networkidle');await page.waitForFunction(()=>document.querySelectorAll('[data-note]').length>0);
 assert.ok(requests.some(u=>/app\.js\?v=[a-f0-9]+/.test(u)));assert.ok(requests.some(u=>/state\.js\?v=[a-f0-9]+/.test(u)));
 await page.getByRole('button',{name:'Open main menu',exact:true}).click();await page.locator('#library-dialog').waitFor({state:'visible'});assert.equal(await page.getByRole('button',{name:'Upload a score',exact:true}).isVisible(),true);await page.locator('#close-library').click();
 await page.getByRole('button',{name:'Adjust part volumes',exact:true}).click();await page.locator('#mixer-drawer').waitFor({state:'visible'});const slider=page.locator('[data-part-volume]').first();await slider.press('Home');assert.equal(await slider.inputValue(),'0');assert.equal(await slider.getAttribute('aria-valuetext'),'0%');assert.deepEqual(errors,[]);
 await page.screenshot({path:'screenshots/railway-cache-fix.png'});console.log('PASS: cached pre-Mix app bypassed; matching versioned modules loaded; main menu and volume slider work.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
