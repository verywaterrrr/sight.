import {copyFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const PUBLIC_FILES=['instruments.js','repeats.js','assets/sounds/manifest.json','assets/sounds/LICENSES.md','assets/sounds/piano-24.mp3','assets/sounds/piano-30.mp3','assets/sounds/piano-36.mp3','assets/sounds/piano-42.mp3','assets/sounds/piano-48.mp3','assets/sounds/piano-54.mp3','assets/sounds/piano-60.mp3','assets/sounds/piano-66.mp3','assets/sounds/piano-72.mp3','assets/sounds/piano-78.mp3','assets/sounds/piano-84.mp3','assets/sounds/piano-90.mp3','assets/sounds/female-67.wav','assets/sounds/female-72.wav','assets/sounds/female-79.wav','assets/sounds/male-43.wav','assets/sounds/male-48.wav','assets/sounds/male-55.wav','assets/sounds/male-60.wav','index.html','styles.css','app.js','audio.js','pitch.js','timeline.js','corrections.js','storage.js','state.js','renderer.js','recognition-client.js','sample-upgrade.js','public-score.js','assets/favicon.svg','assets/app-config.json','assets/morning-practice.pdf','assets/morning-practice.json','vendor/pdf.mjs','vendor/pdf.worker.mjs','vendor/pdf-lib.mjs','vendor/PDFJS-LICENSE','vendor/PDFLIB-LICENSE.md','scripts/fonts/OFL.txt'];
export async function buildPages(root,output){
 const resolved=path.resolve(output);if(resolved===path.resolve(root)||!resolved.startsWith(path.resolve(root)+path.sep))throw new Error('Build output must be a child of the project directory.');
 await rm(resolved,{recursive:true,force:true});await mkdir(resolved,{recursive:true});
 for(const file of PUBLIC_FILES){const target=path.join(resolved,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,file),target);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));await buildPages(root,path.join(root,'dist'));console.log(`Built ${PUBLIC_FILES.length} public files in dist/.`);}
