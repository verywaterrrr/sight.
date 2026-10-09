// Real hosted/local upload: preview selection -> server recognition -> review -> playback -> reload.
const {chromium}=require('./browser-runtime.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1180,height:820},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=process.env.SIGHT_TEST_URL||'http://localhost:5173/';
  await page.goto(url);const ready=()=>page.waitForFunction(()=>document.querySelector('.paper canvas')&&[...document.querySelectorAll('.paper canvas')].every(c=>c.dataset.ready==='true'));
  await ready();
  const config=await (await page.request.get(new URL('assets/app-config.json',url).href)).json();
  assert.equal(config.recognitionAvailable,true);
  const pdf=process.env.SIGHT_TEST_PDF;
  if(pdf)await page.locator('#pdf-file').setInputFiles(pdf);
  else {const response=await page.request.get(new URL('assets/morning-practice.pdf',url).href);await page.locator('#pdf-file').setInputFiles({name:'Cloud test.pdf',mimeType:'application/pdf',buffer:await response.body()});}
  await page.locator('#import-dialog[open]').waitFor();await page.locator('#select-none').click();
  const pages=(process.env.SIGHT_TEST_PAGES||'2,3').split(',').map(Number);
  for(const number of pages)await page.getByRole('button',{name:`Include page ${number}`,exact:true}).click();
  await page.locator('#import-continue').click();await page.locator('#recognition-dialog[open]').waitFor();
  let last='';const timer=setInterval(async()=>{const message=await page.locator('#recognition-message').textContent().catch(()=>null);if(message&&message!==last){last=message;console.log(message);}},15000);
  try{await page.locator('#review-dialog[open]').waitFor({timeout:600000});}catch(error){console.error('Recognition result:',await page.locator('#toast').textContent());throw error;}finally{clearInterval(timer);}
  assert.ok(await page.locator('#review-part option').count()>=4);
  await page.locator('#finish-review').click();await ready();
  const result=await page.evaluate(async()=>{const {library}=await import('./storage.js');const record=await library.get(localStorage.getItem('sight-last-score'));const s=record.score;return {parts:s.parts.length,events:s.events.length,mapped:s.events.filter(n=>n.x!=null&&n.y!=null).length,pages:record.pages,seconds:s.recognition.seconds};});
  assert.deepEqual(result.pages,pages.map(n=>n-1));assert.ok(result.events>50);assert.ok(result.mapped>50);assert.ok(await page.locator('[data-note]').count()>20);
  await page.locator('#play-button').click();assert.equal(await page.locator('#play-button').getAttribute('aria-label'),'Pause score');await page.locator('#stop-button').click();
  await page.reload();await ready();assert.match(await page.locator('#score-status').textContent(),/Recognised/);assert.ok(await page.locator('[data-note]').count()>20);
  assert.deepEqual(errors,[]);console.log('PASS: selected-page PDF upload, actual recognition, review, mapped notes, playback and saved reload.',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
