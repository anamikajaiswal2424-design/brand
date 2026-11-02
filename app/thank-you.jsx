'use client';
import {useEffect,useState} from 'react';
import {Check,ShieldCheck} from 'lucide-react';
import {trackPurchase} from './analytics';
export default function ThankYou({go,clearCart}){
 const [receipt,setReceipt]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  async function load(){try{
   const payment=JSON.parse(sessionStorage.getItem('nl_payment')||'null')?.payment;
   if(!payment?.token)throw Error('No verified payment session was found.');
   const r=await fetch('/api/verify-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:payment.id,token:payment.token}),signal:controller.signal});
   const data=await r.json();if(!r.ok||data.status!=='success'||!data.verifiedAt)throw Error('Your payment has not been verified yet. Please return to payment.');
   setReceipt(data);clearCart();
  }catch(e){if(e.name!=='AbortError')setError(e.message)}}load();return()=>controller.abort();
 },[]);
 useEffect(()=>{if(!receipt)return;const fire=()=>trackPurchase(receipt);fire();window.addEventListener('nl:analytics-ready',fire);return()=>window.removeEventListener('nl:analytics-ready',fire)},[receipt]);
 return <main className="thank-you-page">{receipt?<><div className="thank-you-check"><Check size={38}/></div><span className="eyebrow">PAYMENT VERIFIED</span><h1>Thank you for your order.</h1><p>Your payment was received and your order is confirmed.</p><div className="thank-you-receipt"><span>Order reference<strong>{receipt.id}</strong></span><span>Amount paid<strong>₹{receipt.total.toLocaleString('en-IN')}</strong></span><span><ShieldCheck size={17}/> Verified payment</span></div><button className="btn btn-dark" onClick={()=>go('/')}>CONTINUE SHOPPING</button></>:<><h1>{error?'Payment confirmation pending':'Checking your payment…'}</h1><p>{error||'Please wait while we check the verified payment record.'}</p>{error&&<button className="btn btn-dark" onClick={()=>go('/payment')}>RETURN TO PAYMENT</button>}</>}</main>;
}
