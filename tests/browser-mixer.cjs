const {chromium}=require('./browser-runtime.cjs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1180,height:820}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  async function waitSaved(first,level,last=null){for(let i=0;i<100;i++){const ready=await page.evaluate(async({first,level,last})=>{const {library}=await import('./storage.js');const r=await library.get(localStorage.getItem('sight-last-score'));return r?.partVolumes?.[first]===level&&(!last||r?.partVolumes?.[last]===.6);},{first,level,last});if(ready)return;await page.waitForTimeout(100);}throw Error('Part levels did not save');}
  await page.goto(process.env.SIGHT_TEST_URL||'http://localhost:5173/');await page.waitForLoadState('networkidle');
  await page.waitForFunction(()=>document.querySelectorAll('[data-note]').length>0,{},{timeout:60000});
  await page.getByRole('button',{name:'Adjust part volumes',exact:true}).click();
  const sliders=page.locator('[data-part-volume]');assert.equal(await sliders.count(),5);
  const first=await sliders.first().getAttribute('data-part-volume'),last=await sliders.last().getAttribute('data-part-volume');
  assert.equal(await sliders.first().inputValue(),'100');
  await sliders.first().press('Home');for(let i=0;i<25;i++)await sliders.first().press('ArrowRight');
  await sliders.last().press('End');for(let i=0;i<40;i++)await sliders.last().press('ArrowLeft');
  assert.equal(await sliders.first().getAttribute('aria-valuetext'),'25%');assert.equal(await sliders.last().inputValue(),'60');
  await page.getByRole('button',{name:'Close part volume',exact:true}).click();
  await page.locator(`[data-part="${first}"]`).first().uncheck();
  await page.getByRole('button',{name:'Adjust part volumes',exact:true}).click();
  assert.equal(await sliders.first().inputValue(),'25');assert.equal(await sliders.first().locator('..').locator('small').isVisible(),true);
  await page.locator('#play-button').click();await page.waitForFunction(()=>document.querySelector('#play-button').getAttribute('aria-label')==='Pause score');
  await sliders.last().press('ArrowLeft');assert.equal(await page.locator('#play-button').getAttribute('aria-label'),'Pause score');
  await sliders.last().press('ArrowRight');await page.locator('#stop-button').click();
  await waitSaved(first,.25,last);
  const originalTitle=await page.locator('#score-title').textContent();
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('[data-note]').length>0);
  await page.getByRole('button',{name:'Adjust part volumes',exact:true}).click();
  assert.equal(await sliders.first().inputValue(),'25');assert.equal(await sliders.last().inputValue(),'60');
  await sliders.first().press('Home');await waitSaved(first,0);
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('[data-note]').length>0);await page.getByRole('button',{name:'Adjust part volumes',exact:true}).click();assert.equal(await sliders.first().inputValue(),'0');
  for(const viewport of [{width:820,height:1180},{width:1180,height:820},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.waitForTimeout(150);
   const bounds=await page.locator('.transport').evaluate(el=>[...el.querySelectorAll('button,input')].map(c=>{const r=c.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
   assert.ok(bounds.every(r=>r.left>=0&&r.right<=viewport.width+1&&r.bottom<=viewport.height+1),JSON.stringify({viewport,bounds}));
  }
  await page.setViewportSize({width:820,height:1180});await page.screenshot({path:'screenshots/part-volume-portrait.png'});
  await page.getByRole('button',{name:'Close part volume',exact:true}).click();
  await page.evaluate(async()=>{const {library}=await import('./storage.js');const r=await library.get(localStorage.getItem('sight-last-score'));await library.put({...r,id:'mix-other-score',title:'Mixer isolation score',partVolumes:undefined});});
  await page.locator('#library-button').click();await page.getByRole('button',{name:'Open Mixer isolation score',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#score-title').textContent==='Mixer isolation score');
  await page.getByRole('button',{name:'Adjust part volumes',exact:true}).click();assert.equal(await sliders.first().inputValue(),'100');assert.equal(await sliders.last().inputValue(),'100');
  await page.getByRole('button',{name:'Close part volume',exact:true}).click();await page.locator('#library-button').click();await page.locator('#saved-scores .saved-score-open').filter({hasText:originalTitle}).click();await page.waitForFunction(title=>document.querySelector('#score-title').textContent===title,originalTitle);
  await page.getByRole('button',{name:'Adjust part volumes',exact:true}).click();assert.equal(await sliders.first().inputValue(),'0');assert.equal(await sliders.last().inputValue(),'60');
  const rendered=await page.evaluate(async()=>{
   const {ScorePlayer}=await import('./audio.js');const result=[];
   for(const level of [1,.25,0]){
    const ctx=new OfflineAudioContext(1,48000,48000),p=new ScorePlayer(ctx,{selection:()=>new Set(['p']),volume:()=>level});await p.prepare({parts:[{id:'p',name:'Piano'}],events:[]});p.note(.02,72,.65,'p');p.click(.8,true);
    const data=(await ctx.startRendering()).getChannelData(0),rms=(from,to)=>Math.sqrt(data.slice(from*48000,to*48000).reduce((s,x)=>s+x*x,0)/((to-from)*48000));result.push({note:rms(.1,.5),beat:rms(.8,.9)});p.stop();
   }return result;
  });
  assert.ok(rendered[0].note>.001);assert.ok(Math.abs(rendered[1].note/rendered[0].note-.25)<.00001);assert.equal(rendered[2].note,0);assert.ok(rendered[2].beat>.001);assert.ok(Math.abs(rendered[0].beat-rendered[2].beat)<1e-8);assert.deepEqual(errors,[]);
  console.log('PASS: live part sliders, mute levels, zero/reload, separate score mixes, tablet/phone layout and actual sampled-audio gain; beat unchanged.',rendered);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
