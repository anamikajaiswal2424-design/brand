import {NextResponse} from 'next/server';
import {paymentCollections,verifyMongoOrder} from '../../../lib/payment-database';
export const dynamic='force-dynamic';
export async function POST(req){
 const headers={'Cache-Control':'no-store'};
 if(req.headers.get('origin')!==new URL(req.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403,headers});
 const body=await req.json().catch(()=>null);
 if(!body||typeof body.id!=='string'||typeof body.token!=='string'||body.token.length!==64)return NextResponse.json({error:'Invalid payment session'},{status:400,headers});
 try{const result=await verifyMongoOrder(body.id,body.token,await paymentCollections());return result?NextResponse.json(result,{headers}):NextResponse.json({error:'Payment session not found'},{status:404,headers})}
 catch{return NextResponse.json({status:'pending',error:'Verification is temporarily unavailable. Please do not pay again.'},{status:503,headers})}
}
