'use client';
import {useEffect,useState} from 'react';
import {initializeMetaPixel} from '../lib/meta-pixel';
export function trackPurchase(receipt){
 if(typeof window==='undefined'||location.pathname!=='/thank-you'||!window.fbq||receipt?.status!=='success'||!receipt.verifiedAt)return;
 const key='nl_purchase_'+receipt.id;
 if(window.__nlPurchaseSent?.has(key))return;
 try{if(localStorage.getItem(key))return}catch{}
 window.fbq('track','Purchase',{value:receipt.total,currency:'INR',content_ids:receipt.items.map(x=>x.id),content_type:'product',num_items:receipt.items.reduce((n,x)=>n+x.qty,0)},{eventID:receipt.id});
 (window.__nlPurchaseSent??=new Set()).add(key);try{localStorage.setItem(key,'sent')}catch{}
}
export default function Analytics(){
 const [pixel,setPixel]=useState(null),[choice,setChoice]=useState('loading');
 useEffect(()=>{try{setChoice(localStorage.getItem('nl_analytics')||'')}catch{setChoice('denied')}fetch('/api/payment-config').then(r=>r.json()).then(x=>setPixel(x.pixelId)).catch(()=>{});},[]);
 useEffect(()=>{
  if(choice!=='allowed'||!pixel)return;
  initializeMetaPixel(pixel);
  const page=()=>{const url=location.href;if(window.__nlPixelPage!==url){window.__nlPixelPage=url;window.fbq('track','PageView')}};page();window.dispatchEvent(new Event('nl:analytics-ready'));window.addEventListener('nl:navigate',page);window.addEventListener('popstate',page);return()=>{window.removeEventListener('nl:navigate',page);window.removeEventListener('popstate',page)};
 },[choice,pixel]);
 const choose=value=>{try{localStorage.setItem('nl_analytics',value)}catch{}setChoice(value)};
 if(!pixel||choice)return null;
 return <aside className="analytics-consent" aria-label="Analytics preferences"><p>Allow Meta analytics to help us understand shopping activity? Delivery details are not included.</p><div><button onClick={()=>choose('denied')}>Essential only</button><button onClick={()=>choose('allowed')}>Allow analytics</button></div></aside>;
}
