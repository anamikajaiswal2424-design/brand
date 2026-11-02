import {MongoClient} from 'mongodb';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {buildUpiPayment,validateAddress,quoteOrder} from './upi-order.js';
let connection;
export async function paymentCollections(){
 if(!process.env.MONGODB_URI)throw Error('PAYMENT_DATABASE_NOT_CONFIGURED');
 if(!connection){const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000,maxPoolSize:5});connection=client.connect().catch(e=>{connection=undefined;throw e})}
 const client=await connection;const db=client.db(process.env.MONGODB_DB||'paytm_db');
 return {orders:db.collection('northline_orders'),transactions:db.collection(process.env.MONGODB_TRANSACTIONS_COLLECTION||'transactions')};
}
function signingSecret(){const value=process.env.SESSION_SECRET;if(!value||value.length<32)throw Error('PAYMENT_SESSION_NOT_CONFIGURED');return value}
export function accessToken(id,requestId){return createHmac('sha256',signingSecret()).update(id+':'+requestId).digest('hex')}
export function tokenMatches(token,order){if(typeof token!=='string'||!order)return false;const expected=accessToken(order._id,order.requestId);return token.length===expected.length&&timingSafeEqual(Buffer.from(token),Buffer.from(expected))}
export function buildNativePhonePe(amount,id,config){
 const payload={contact:{type:'EXTERNAL_MERCHANT',name:config.payee,vpa:config.upiId},p2pPaymentCheckoutParams:{checkoutType:'COLLECT',initialAmount:Math.round(amount*100),note:{type:'text',message:id},supportedInstruments:-1}};
 return 'phonepe://native?data='+encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString('base64'))+'&id=p2ppayment';
}
export async function initiateVerifiedPayment(payload,{store,config,orders}){
 if(!validateAddress(payload?.customer))throw Error('Please enter valid delivery details.');
 const payment=buildUpiPayment(payload,{store,config});
 const quote=quoteOrder(payload.items,store);
 const customer=Object.fromEntries(['name','phone','address','city','state','pincode'].map(k=>[k,payload.customer[k].trim()]));
 const fingerprint=createHash('sha256').update(JSON.stringify({items:quote.items,customer})).digest('hex');
 // The existing request ID is unpredictable; the HMAC additionally binds the reference to this store.
 const id='NL-'+createHmac('sha256',signingSecret()).update(payload.requestId).digest('hex').slice(0,24).toUpperCase();
 const draft={_id:id,requestId:payload.requestId,fingerprint,customer,...quote,payee:config.payee,upiId:config.upiId,paymentStatus:'pending',createdAt:new Date()};
 await orders.updateOne({_id:id},{$setOnInsert:draft},{upsert:true});
 const saved=await orders.findOne({_id:id});
 if(saved.fingerprint!==fingerprint||saved.total!==quote.total||saved.upiId!==config.upiId)throw Error('Order changed. Please return to your bag and start a new payment.');
 const ref=payment.id;
 return {...payment,id,token:accessToken(id,payload.requestId),status:saved.paymentStatus,phonepeUrl:buildNativePhonePe(saved.total,id,{payee:saved.payee,upiId:saved.upiId}),upiUrl:payment.upiUrl.replaceAll(ref,id),paytmUrl:payment.paytmUrl.replaceAll(ref,id)};
}
export function transactionQuery(order){
 const exact=new RegExp('^'+order._id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i');
 return {status:{$regex:/^SUCCESS$/i},$and:[
  {$or:[{comment:exact},{$and:[{$or:[{comment:{$exists:false}},{comment:null},{comment:''}]},{remark:exact}]}]},
  {$or:[{verifiedOrderId:{$exists:false}},{verifiedOrderId:null},{verifiedOrderId:exact}]}
 ],$expr:{$eq:[{$round:[{$multiply:[{$convert:{input:{$ifNull:['$amount',{$ifNull:['$totalAmount','$value']}]},to:'double',onError:-1,onNull:-1}},100]},0]},Math.round(order.total*100)]}};
}
export async function verifyMongoOrder(id,token,{orders,transactions}){
 if(typeof id!=='string'||!/^NL-[A-F0-9]{24}$/.test(id))return null;
 const order=await orders.findOne({_id:id});
 if(!tokenMatches(token,order))return null;
 if(order.paymentStatus==='success')return publicReceipt(order);
 const query=transactionQuery(order);
 const matches=await transactions.find(query).limit(2).toArray();
 if(matches.length!==1)return {id,status:'pending'};
 const claimed=await transactions.findOneAndUpdate({...query,_id:matches[0]._id},{$set:{verifiedOrderId:id.toLowerCase(),verifiedAt:new Date()}},{returnDocument:'after',includeResultMetadata:false});
 if(!claimed)return {id,status:'pending'};
 const verifiedAt=new Date();
 await orders.updateOne({_id:id,paymentStatus:'pending'},{$set:{paymentStatus:'success',verifiedAt,transactionId:String(claimed._id),utr:String(claimed.utrNo||claimed.utr||claimed.bankTxnId||'')}});
 return publicReceipt(await orders.findOne({_id:id}));
}
export function publicReceipt(order){return {id:order._id,status:order.paymentStatus,total:order.total,currency:'INR',items:order.items.map(x=>({id:x.id,qty:x.qty})),verifiedAt:order.verifiedAt?.toISOString?.()||null}}
