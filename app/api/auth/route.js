import {NextResponse} from 'next/server';
import {passwordMatches,sign,secureHeaders} from '../../../lib/security';
export async function POST(req){const {password}=await req.json().catch(()=>({}));if(!passwordMatches(password))return NextResponse.json({error:'Invalid credentials'},{status:401,headers:secureHeaders});const expiry=String(Date.now()+8*60*60*1000);const r=NextResponse.json({ok:true},{headers:secureHeaders});r.cookies.set('nl_admin',`${expiry}.${sign(expiry)}`,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',maxAge:28800,path:'/'});return r;}
export async function DELETE(){const r=NextResponse.json({ok:true},{headers:secureHeaders});r.cookies.delete('nl_admin');return r;}
