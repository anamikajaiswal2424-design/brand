import {NextResponse} from 'next/server';
import {readStore} from '../../../lib/github';
import {paymentConfig,validateAddress,quoteOrder} from '../../../lib/upi-order';
import {paymentCollections,initiateVerifiedPayment} from '../../../lib/payment-database';
import QRCode from 'qrcode';
export const dynamic='force-dynamic';
export async function POST(req){
 const headers={'Cache-Control':'no-store'};
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403,headers});
 const raw=await req.text();
 if(raw.length>30000)return NextResponse.json({error:'Request too large'},{status:413,headers});
 let payload;try{payload=JSON.parse(raw)}catch{return NextResponse.json({error:'Invalid request'},{status:400,headers})}
 try{
  const config=paymentConfig();
  if(!config.enabled)return NextResponse.json({error:'UPI payments are not configured. Please contact the store.'},{status:503,headers});
  if(!process.env.MONGODB_URI?.trim()||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)return NextResponse.json({code:'PAYMENT_SETUP_REQUIRED',error:'Online payment is temporarily unavailable. Please contact the store.'},{status:503,headers});
  if(!validateAddress(payload?.customer))return NextResponse.json({code:'ADDRESS_REQUIRED',error:'Please confirm your delivery address before paying.'},{status:400,headers});
  const store=await readStore();quoteOrder(payload.items,store);
  const {orders}=await paymentCollections();
  const result=await initiateVerifiedPayment(payload,{store,config,orders});
  return NextResponse.json({...result,qr:await QRCode.toDataURL(result.upiUrl,{width:280,margin:2,errorCorrectionLevel:'M'})},{headers});
 }catch(e){
  const expected=/bag|product|option|stock|payable|delivery|request|changed|processed/i.test(e.message)&&!e.message.startsWith('PAYMENT_');
  const code=/Order changed/i.test(e.message)?'ORDER_CHANGED':expected?'INVALID_CHECKOUT':'PAYMENT_UNAVAILABLE';
  return NextResponse.json({code,error:expected?e.message:'Could not prepare your payment. Please try again shortly.'},{status:expected?400:503,headers});
 }
}
