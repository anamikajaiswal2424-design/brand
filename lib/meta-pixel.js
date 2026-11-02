export function initializeMetaPixel(pixel,scope=window,dom=document){
 if(!scope.fbq){
  const q=function(){q.callMethod?q.callMethod.apply(q,arguments):q.queue.push(arguments)};
  q.push=q;q.loaded=true;q.version='2.0';q.queue=[];scope.fbq=q;
  if(!scope._fbq)scope._fbq=q;
 }
 const source='https://connect.facebook.net/en_US/fbevents.js';
 if(!scope.fbq.callMethod&&!dom.querySelector('script[src*="connect.facebook.net/"][src*="fbevents.js"]')){const script=dom.createElement('script');script.id='northline-meta-pixel';script.async=true;script.src=source;dom.head.appendChild(script)}
 const initialized=scope.__nlPixelInitialized??=new Set();
 const existing=scope.fbq.getState?.()?.pixels;
 const known=Array.isArray(existing)&&existing.some(p=>String(p.id)===String(pixel));
 if(!initialized.has(pixel)&&!known){scope.fbq('set','autoConfig',false,pixel);scope.fbq('init',pixel)}
 initialized.add(pixel);
}
