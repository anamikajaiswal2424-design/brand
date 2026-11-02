import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentConfig,quoteOrder,prepareUpiOrder} from '../lib/upi-order.js';
const store={settings:{shipping:79,freeShippingAbove:999},products:[{id:'tee',title:'Tee',price:249,stock:4,sizes:['S','M'],colors:['Black']}]};
const items=[{id:'tee',qty:1,size:'S',color:'Black'}];
const payload={requestId:'12345678-1234-1234-1234-123456789abc',items,total:1,customer:{name:'Test Buyer',phone:'9999999999',address:'Test street',city:'Test city',state:'Test state',pincode:'123456'}};
const config=paymentConfig({PAYMENT_UPI_ID:'test@upi',PAYMENT_PAYEE_NAME:'Test Store'});
test('server calculates payable amount, ignoring client-supplied total',async()=>{
 let saved;const r=await prepareUpiOrder(payload,{store,orders:[],config,save:async v=>saved=v});
 assert.equal(r.total,328);assert.equal(new URL(r.upiUrl).searchParams.get('am'),'328.00');assert.equal(saved[0].paymentStatus,'Pending verification');assert.equal(saved[0].paymentMethod,'UPI');assert.ok(r.phonepeUrl.includes('package=com.phonepe.app'));assert.ok(!r.upiUrl.includes(payload.customer.phone));
});
test('same request resumes without creating another order',async()=>{
 let orders;const deps={store,orders:[],config,save:async v=>orders=v};const a=await prepareUpiOrder(payload,deps);const b=await prepareUpiOrder(payload,{...deps,orders,save:async()=>assert.fail('duplicate save')});assert.equal(a.id,b.id);
 await assert.rejects(prepareUpiOrder({...payload,items:[{...items[0],qty:2}]},{...deps,orders}),/changed/);
});
test('rejects malformed address, options and combined excess stock',async()=>{
 await assert.rejects(prepareUpiOrder({...payload,customer:{...payload.customer,name:42}},{store,orders:[],config,save:async()=>{}}),/delivery/);
 assert.throws(()=>quoteOrder([{...items[0],size:'INVALID'}],store),/option/);
 assert.throws(()=>quoteOrder([{...items[0],qty:3},{...items[0],size:'M',qty:3}],store),/stock/);
});
test('does not return a pay link when configuration or persistence fails',async()=>{
 assert.equal(paymentConfig({}).enabled,false);
 await assert.rejects(prepareUpiOrder(payload,{store,orders:[],config:{enabled:false},save:async()=>{}}),/configured/);
 await assert.rejects(prepareUpiOrder(payload,{store,orders:[],config,save:async()=>{throw Error('storage unavailable')}}),/storage unavailable/);
});
