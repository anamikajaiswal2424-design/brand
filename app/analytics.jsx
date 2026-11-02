'use client';
import {useEffect,useState} from 'react';
export function track(name,data={}){if(typeof window!=='undefined'&&window.fbq)window.fbq('track',name,data);}
export default function Analytics(){
 const [pixel,setPixel]=useState(null),[choice,setChoice]=useState('loading');
 useEffect(()=>{try{setChoice(localStorage.getItem('nl_analytics')||'')}catch{setChoice('denied')}fetch('/api/payment-config').then(r=>r.json()).then(x=>setPixel(x.pixelId)).catch(()=>{});},[]);
 useEffect(()=>{
  if(choice!=='allowed'||!pixel)return;
  if(!window.fbq){const q=function(){q.callMethod?q.callMethod.apply(q,arguments):q.queue.push(arguments)};q.queue=[];q.loaded=true;q.version='2.0';window.fbq=q;const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(script);q('init',pixel);}
  const page=()=>track('PageView');page();window.addEventListener('nl:navigate',page);return()=>window.removeEventListener('nl:navigate',page);
 },[choice,pixel]);
 const choose=value=>{try{localStorage.setItem('nl_analytics',value)}catch{}setChoice(value)};
 if(!pixel||choice)return null;
 return <aside className="analytics-consent" aria-label="Analytics preferences"><p>Allow Meta analytics to help us understand shopping activity? Delivery details are not included.</p><div><button onClick={()=>choose('denied')}>Essential only</button><button onClick={()=>choose('allowed')}>Allow analytics</button></div></aside>;
}
