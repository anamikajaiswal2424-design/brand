import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initiateVerifiedPayment,verifyMongoOrder,transactionQuery,buildNativePhonePe,accessToken} from '../lib/payment-database.js';
process.env.SESSION_SECRET='local-test-secret-that-is-at-least-32-characters';
const store={settings:{shipping:79,freeShippingAbove:999},products:[{id:'tee',title:'Tee',price:249,stock:10,sizes:['S'],colors:['Black']}]};
const payload={requestId:'12345678-1234-1234-1234-123456789abc',items:[{id:'tee',qty:1,size:'S',color:'Black'}],customer:{name:'Test Buyer',phone:'9999999999',address:'Test street',city:'Test city',state:'Test state',pincode:'123456'}};
const config={enabled:true,upiId:'test@upi',payee:'Test Store'};
function fixture(){
 let order;let claimCount=0;
 const orders={async updateOne(filter,update){if(update.$setOnInsert){order??=structuredClone(update.$setOnInsert)}else Object.assign(order,update.$set);return {acknowledged:true}},async findOne(){return order}};
 const transactions={candidates:[],async find(query){throw Error('unused')},find(query){this.query=query;return{limit(){return{toArray:async()=>transactions.candidates}}}},async findOneAndUpdate(query){claimCount++;return this.claim===false?null:{_id:'bank-record',utr:'123456789012'}}};
 return {orders,transactions,get order(){return order},get claims(){return claimCount}};
}
test('native payload preserves exact paise amount and reference',()=>{
 const url=buildNativePhonePe(328,'NL-ORDER',config);assert.ok(url.startsWith('phonepe://native?'));
 const decoded=JSON.parse(Buffer.from(new URL(url).searchParams.get('data'),'base64'));
 assert.equal(decoded.contact.vpa,'test@upi');assert.equal(decoded.p2pPaymentCheckoutParams.initialAmount,32800);assert.equal(decoded.p2pPaymentCheckoutParams.note.message,'NL-ORDER');
});
test('pending order is stored before links return and retries use same record',async()=>{
 const f=fixture();const a=await initiateVerifiedPayment(payload,{store,config,orders:f.orders});const b=await initiateVerifiedPayment(payload,{store,config,orders:f.orders});
 assert.equal(a.id,b.id);assert.equal(f.order.total,328);assert.equal(f.order.paymentStatus,'pending');assert.equal(f.order.customer.name,'Test Buyer');assert.ok(a.token.length===64);
 await assert.rejects(initiateVerifiedPayment({...payload,items:[{...payload.items[0],qty:2}]},{store,config,orders:f.orders}),/changed/);
});
test('query requires success, exact comment, exact decimal amount and unclaimed transaction',()=>{
 const q=transactionQuery({_id:'NL-ABC',total:328});assert.equal(q.status.$regex.test('SUCCESS'),true);assert.equal(q.status.$regex.test('FAILED'),false);assert.equal(q.$and[0].$or[0].comment.test('NL-ABC'),true);assert.equal(q.$and[0].$or[0].comment.test('xxNL-ABC'),false);assert.equal(q.$expr.$eq[1],32800);assert.equal(q.$and[1].$or[2].verifiedOrderId.test('nl-abc'),true);assert.equal(q.$expr.$eq[0].$round[0].$multiply[0].$convert.to,'double');
});
test('unauthorized, pending, ambiguous and race-lost records never confirm',async()=>{
 const f=fixture();const p=await initiateVerifiedPayment(payload,{store,config,orders:f.orders});
 assert.equal(await verifyMongoOrder(p.id,'0'.repeat(64),f),null);
 assert.equal((await verifyMongoOrder(p.id,p.token,f)).status,'pending');
 f.transactions.candidates=[{_id:'a'},{_id:'b'}];assert.equal((await verifyMongoOrder(p.id,p.token,f)).status,'pending');assert.equal(f.claims,0);
 f.transactions.candidates=[{_id:'a'}];f.transactions.claim=false;assert.equal((await verifyMongoOrder(p.id,p.token,f)).status,'pending');assert.equal(f.order.paymentStatus,'pending');
});
test('one atomic successful match confirms stored order and creates verified receipt',async()=>{
 const f=fixture();const p=await initiateVerifiedPayment(payload,{store,config,orders:f.orders});f.transactions.candidates=[{_id:'a'}];
 const result=await verifyMongoOrder(p.id,p.token,f);assert.equal(result.status,'success');assert.equal(result.total,328);assert.ok(result.verifiedAt);assert.equal(f.order.utr,'123456789012');assert.equal(f.claims,1);
 assert.equal((await verifyMongoOrder(p.id,p.token,f)).status,'success');assert.equal(f.claims,1);
});
test('Purchase only on Thank You after verification, once per receipt',()=>{
 const source=fs.readFileSync(new URL('../app/analytics.jsx',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('export function trackPurchase'),source.indexOf('export default')).replace('export function','function');
 const events=[],values=new Map();const context={window:{fbq:(...args)=>events.push(args)},location:{pathname:'/payment'},localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}};
 vm.createContext(context);vm.runInContext(fn,context);
 const receipt={id:'NL-TEST',total:328,status:'success',verifiedAt:new Date().toISOString(),items:[{id:'tee',qty:1}]};
 context.trackPurchase(receipt);assert.equal(events.length,0);context.location.pathname='/thank-you';context.trackPurchase({...receipt,status:'pending'});assert.equal(events.length,0);context.trackPurchase(receipt);context.trackPurchase(receipt);assert.equal(events.length,1);assert.equal(events[0][1],'Purchase');assert.equal(events[0][3].eventID,'NL-TEST');
 for(const path of ['../app/storefront.jsx','../app/checkout-flow.jsx'])assert.doesNotMatch(fs.readFileSync(new URL(path,import.meta.url),'utf8'),/AddToCart|InitiateCheckout|AddPaymentInfo/);
});
