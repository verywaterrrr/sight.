// Drive the real import UI; stub only the remote recognition job responses.
const {chromium}=require('./browser-runtime.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:820,height:1180},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const config=JSON.parse(fs.readFileSync('dist/assets/app-config.json'));config.recognitionApiBase='';
  const score=JSON.parse(fs.readFileSync('assets/morning-practice.json'));
  let job={id:'progress-test',status:'queued',percent:null,message:'Waiting for recognition…'},cancelled=0;
  await page.route('**/assets/app-config.json',route=>route.fulfill({json:config}));
  await page.route('**/api/jobs**',route=>{
   if(route.request().method()==='DELETE'){cancelled++;return route.fulfill({json:{status:'cancelled'}});}
   return route.fulfill({json:job});
  });
  await page.goto(process.env.SIGHT_TEST_URL||'http://localhost:5173/');await page.waitForLoadState('networkidle');
  await page.waitForFunction(()=>document.querySelectorAll('[data-note]').length>0);
  async function start(){
   await page.locator('#pdf-file').setInputFiles('assets/morning-practice.pdf');
   await page.locator('#import-dialog[open]').waitFor();await page.locator('#select-none').click();
   for(const n of [2,3])await page.getByRole('button',{name:`Include page ${n}`,exact:true}).click();
   await page.locator('#import-continue').click();await page.locator('#recognition-dialog[open]').waitFor();
  }
  await start();
  await page.waitForFunction(()=>document.querySelector('#recognition-percent').textContent==='Waiting');
  assert.equal(await page.locator('#recognition-progress').getAttribute('value'),null);
  job={...job,status:'running',percent:52,pageIndex:2,pageCount:2,sourcePage:3,message:'Reading notes and musical symbols…'};
  await page.waitForFunction(()=>document.querySelector('#recognition-progress').value===52);
  assert.equal(await page.locator('#recognition-percent').textContent(),'52%');
  assert.equal(await page.locator('#recognition-page').textContent(),'Page 3 · 2 of 2 selected pages');
  await page.waitForTimeout(1800);assert.equal(await page.locator('#recognition-progress').evaluate(el=>el.value),52);
  const bounds=await page.locator('#recognition-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=820);
  await page.screenshot({path:'screenshots/recognition-progress.png'});
  await page.locator('#cancel-recognition').click();await page.locator('#recognition-dialog').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('cancelled'));
  assert.equal(cancelled,1);
  job={id:'progress-test',status:'queued',percent:null,message:'Waiting for recognition…'};await start();
  await page.waitForFunction(()=>document.querySelector('#recognition-percent').textContent==='Waiting');
  assert.equal(await page.locator('#recognition-progress').getAttribute('value'),null);
  assert.equal(await page.locator('#recognition-page').isVisible(),false);
  job={...job,status:'error',error:'Test recognition failure'};
  await page.locator('#recognition-dialog').waitFor({state:'hidden'});
  assert.match(await page.locator('#toast').textContent(),/Test recognition failure/);
  job={id:'progress-test',status:'queued',percent:null,message:'Waiting for recognition…'};await start();
  job={...job,status:'running',percent:98,stage:'finalizing',message:'Preparing the playable score…'};
  await page.waitForFunction(()=>document.querySelector('#recognition-progress').value===98);
  job={...job,status:'done',percent:100,score,message:'Ready for review'};
  await page.locator('#review-dialog[open]').waitFor();
  assert.equal(await page.locator('#recognition-progress').evaluate(el=>el.value),100);
  assert.deepEqual(errors,[]);
  console.log('PASS: queued, reported progress without timed increases, page details, tablet layout, cancellation, retry reset, failure and completed review.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
