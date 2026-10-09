// Render the original PDF at reading resolution; CSS zoom never stretches a stale bitmap.
export function rasterDimensions(cssWidth,cssHeight,deviceRatio=1,maxPixels=16_000_000){
 const desired=Math.max(3,Math.min(4,deviceRatio||1));
 const ratio=Math.min(desired,Math.sqrt(maxPixels/(cssWidth*cssHeight)));
 return {width:Math.floor(cssWidth*ratio),height:Math.floor(cssHeight*ratio),ratio};
}
export async function renderPdfPage(pdf,index,canvas,cssWidth,{quality=3}={}){
 const page=await pdf.getPage(index+1);
 const base=page.getViewport({scale:1});
 const viewport=page.getViewport({scale:cssWidth/base.width});
 const raster=rasterDimensions(viewport.width,viewport.height,Math.max(globalThis.devicePixelRatio||1,quality));
 canvas.width=raster.width;canvas.height=raster.height;
 const ctx=canvas.getContext('2d',{alpha:false});
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 await page.render({canvasContext:ctx,viewport,transform:[raster.ratio,0,0,raster.ratio,0,0],background:'white'}).promise;
 canvas.dataset.ready='true';canvas.dataset.density=raster.ratio.toFixed(2);
 return base;
}
