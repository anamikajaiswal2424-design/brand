import {createHash,randomUUID} from 'node:crypto';
export function paymentConfig(env=process.env){
 const upiId=(env.PAYMENT_UPI_ID||'').trim();
 const payee=(env.PAYMENT_PAYEE_NAME||'').trim();
 return {upiId,payee,enabled:/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/.test(upiId)&&payee.length>0&&payee.length<=100};
}
export function validateAddress(c){return c&&['name','phone','address','city','state','pincode'].every(k=>typeof c[k]==='string')&&c.name.trim().length>0&&c.name.length<=100&&/^\d{10}$/.test(c.phone)&&c.address.trim().length>0&&c.address.length<=300&&c.city.trim().length>0&&c.city.length<=100&&c.state.trim().length>0&&c.state.length<=100&&/^\d{6}$/.test(c.pincode);}
export function quoteOrder(items,store){
 if(!Array.isArray(items)||!items.length||items.length>50)throw Error('Your bag is empty or invalid.');
 const quantities=new Map();
 const lines=items.map(item=>{
  const p=item&&store.products.find(p=>p.id===item.id);
  if(!p||!Number.isInteger(item.qty)||item.qty<1||item.qty>10||!p.sizes.includes(item.size)||!p.colors.includes(item.color))throw Error('A product or selected option is unavailable.');
  quantities.set(p.id,(quantities.get(p.id)||0)+item.qty);
  if(quantities.get(p.id)>p.stock)throw Error('Not enough stock for '+p.title+'.');
  return {id:p.id,title:p.title,price:p.price,qty:item.qty,size:item.size,color:item.color};
 });
 const subtotal=Math.round(lines.reduce((n,x)=>n+x.price*x.qty,0)*100)/100;
 const shipping=subtotal>=store.settings.freeShippingAbove?0:store.settings.shipping;
 const total=Math.round((subtotal+shipping)*100)/100;
 if(!Number.isFinite(total)||total<=0)throw Error('Invalid payable amount.');
 return {items:lines,subtotal,shipping,total};
}
export async function prepareUpiOrder(payload,{store,orders,save,config}){
 if(!config.enabled)throw Error('UPI payments are not configured. Please contact the store.');
 if(!validateAddress(payload?.customer))throw Error('Please enter valid delivery details.');
 if(typeof payload.requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(payload.requestId))throw Error('Invalid payment request.');
 const quote=quoteOrder(payload.items,store);
 const customer=Object.fromEntries(Object.entries(payload.customer).filter(([k])=>['name','phone','address','city','state','pincode'].includes(k)).map(([k,v])=>[k,v.trim()]));
 const fingerprint=createHash('sha256').update(JSON.stringify({items:quote.items,customer})).digest('hex');
 let order=orders.find(o=>o.paymentRequestId===payload.requestId);
 if(order&&(order.fingerprint!==fingerprint||order.total!==quote.total))throw Error('Order changed. Please return to the summary and try again.');
 if(order&&order.paymentStatus!=='Pending verification')throw Error('This order has already been processed. Contact support.');
 if(!order){
  order={id:'NL-'+randomUUID().replaceAll('-','').slice(0,16).toUpperCase(),createdAt:new Date().toISOString(),status:'Awaiting payment verification',paymentStatus:'Pending verification',paymentMethod:'UPI',paymentRequestId:payload.requestId,fingerprint,customer,...quote};
  await save([order,...orders]);
 }
 const params=new URLSearchParams({pa:config.upiId,pn:config.payee,tr:order.id,tn:'Order '+order.id,am:order.total.toFixed(2),cu:'INR'}).toString().replaceAll('+','%20');
 return {id:order.id,total:order.total,subtotal:order.subtotal,shipping:order.shipping,status:order.paymentStatus,payee:config.payee,upiId:config.upiId,upiUrl:'upi://pay?'+params,phonepeUrl:'intent://pay?'+params+'#Intent;scheme=upi;package=com.phonepe.app;end',paytmUrl:'intent://pay?'+params+'#Intent;scheme=upi;package=net.one97.paytm;end'};
}
