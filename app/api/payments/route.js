import {NextResponse} from 'next/server';
import {readStore} from '../../../lib/github';
import {paymentConfig,buildUpiPayment} from '../../../lib/upi-order';
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
  const result=buildUpiPayment(payload,{store:await readStore(),config});
  return NextResponse.json({...result,qr:await QRCode.toDataURL(result.upiUrl,{width:280,margin:2,errorCorrectionLevel:'M'})},{headers});
 }catch(e){
  const expected=/bag|product|option|stock|payable|delivery|request|changed|processed|configured/i.test(e.message);
  return NextResponse.json({error:expected?e.message:'Could not prepare payment. Please try again.'},{status:expected?400:503,headers});
 }
}
