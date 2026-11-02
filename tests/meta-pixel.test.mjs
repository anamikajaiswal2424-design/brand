import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeMetaPixel} from '../lib/meta-pixel.js';
test('standard Pixel queue and script are initialized only once',()=>{
 const scripts=[];const scope={};const dom={querySelector:()=>scripts[0],createElement:()=>({}),head:{appendChild:x=>scripts.push(x)}};
 initializeMetaPixel('12345',scope,dom);initializeMetaPixel('12345',scope,dom);
 assert.equal(scope.fbq.push,scope.fbq);assert.equal(scope._fbq,scope.fbq);assert.equal(scripts.length,1);assert.equal(scope.fbq.queue.filter(a=>a[0]==='init').length,1);
});
test('reuses an already loaded Pixel without another script or duplicate init',()=>{
 const events=[];const fbq=(...args)=>events.push(args);fbq.callMethod=()=>{};fbq.getState=()=>({pixels:[{id:'12345'}]});
 initializeMetaPixel('12345',{fbq},{querySelector:()=>null,createElement:()=>assert.fail('duplicate script'),head:{appendChild:()=>assert.fail('duplicate script')}});
 assert.equal(events.length,0);
});
