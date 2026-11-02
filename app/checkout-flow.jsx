'use client';
import {useEffect,useState,useRef} from 'react';
import {ArrowLeft,ArrowRight,Check,ShieldCheck,QrCode,MapPin,Smartphone} from 'lucide-react';

const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const empty={name:'',phone:'',address:'',city:'',state:'',pincode:''};
const valid=c=>c&&Object.keys(empty).every(k=>typeof c[k]==='string'&&c[k].trim())&&/^\d{10}$/.test(c.phone)&&/^\d{6}$/.test(c.pincode);
function read(key,fallback){try{return JSON.parse(sessionStorage.getItem(key))||fallback}catch{return fallback}}
function save(key,value){try{sessionStorage.setItem(key,JSON.stringify(value))}catch{}}
export default function CheckoutFlow({route,go,cart,lines,subtotal,shipping,total}){
 const step=route==='/order-summary'?1:route==='/payment'?2:0;
 const [address,setAddress]=useState(empty),[hydrated,setHydrated]=useState(false),[config,setConfig]=useState(null),[payment,setPayment]=useState(null),[method,setMethod]=useState('phonepe'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[launched,setLaunched]=useState(false),[verification,setVerification]=useState('idle'),[verificationError,setVerificationError]=useState('');
 const preparing=useRef(false),autoStarted=useRef('');
 const [sessionReady,setSessionReady]=useState(false);
 const signature=JSON.stringify({items:cart,customer:address});
 useEffect(()=>{setAddress(read('nl_address',empty));setHydrated(true);fetch('/api/payment-config').then(r=>r.json()).then(setConfig).catch(()=>setConfig({enabled:false}));},[]);
 useEffect(()=>{if(!hydrated)return;const saved=read('nl_payment',null);setPayment(saved?.signature===signature&&saved.payment?.token?saved.payment:null);setError('');setLaunched(false);setSessionReady(signature);},[signature,hydrated]);
 useEffect(()=>{if(route==='/payment'&&hydrated&&sessionReady===signature&&config?.enabled&&!payment&&!busy&&autoStarted.current!==signature){autoStarted.current=signature;prepare();}},[route,hydrated,sessionReady,config?.enabled,signature,payment,busy]);
 useEffect(()=>{
  if(route!=='/payment'||!payment?.token)return;
  let stopped=false,timer,redirect;const controller=new AbortController();
  setVerification('pending');setVerificationError('');
  const check=async()=>{try{
   const r=await fetch('/api/verify-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:payment.id,token:payment.token}),signal:controller.signal});
   const result=await r.json();if(stopped)return;
   if(r.ok&&result.status==='success'&&result.verifiedAt){setVerification('success');setVerificationError('');redirect=setTimeout(()=>go('/thank-you'),2000);return}
   setVerificationError(r.ok?'':result.error||'Verification is temporarily unavailable. Do not pay again.');
  }catch(e){if(!stopped&&e.name!=='AbortError')setVerificationError('Connection interrupted. Checking again; do not pay again.');}
  if(!stopped)timer=setTimeout(check,2000);};check();
  return()=>{stopped=true;controller.abort();clearTimeout(timer);clearTimeout(redirect)};
 },[route,payment?.id,payment?.token]);
 const details=payment||{subtotal,shipping,total};
 const itemCount=lines.reduce((n,x)=>n+x.qty,0);
 const priceDetails=<section className="checkout-panel price-details"><h2>Price details</h2><div><span>Price ({itemCount} {itemCount===1?'item':'items'})</span><b>{money(details.subtotal)}</b></div><div><span>Delivery charges</span><b className={!details.shipping?'free-delivery':''}>{details.shipping?money(details.shipping):'FREE'}</b></div><div className="payable"><span>Amount payable</span><strong>{money(details.total)}</strong></div><p>Inclusive of applicable taxes</p></section>;
 const prepare=async()=>{
  if(preparing.current)return;
  if(!valid(address)){setError('Please confirm your delivery address before paying.');return}

  if(!config?.enabled){setError('UPI payments are not configured yet. Please contact the store.');return}
  preparing.current=true;setBusy(true);setError('');
  try{
   let request=read('nl_payment_request',null);
   if(request?.signature!==signature){request={signature,id:crypto.randomUUID()};save('nl_payment_request',request)}
   const response=await fetch('/api/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:cart,customer:address,requestId:request.id})});
   const data=await response.json();if(!response.ok){if(data.code==='ORDER_CHANGED'){try{sessionStorage.removeItem('nl_payment_request');sessionStorage.removeItem('nl_payment')}catch{}}throw Error(data.error||'Unable to prepare payment.');}
   setPayment(data);save('nl_payment',{signature,payment:data});go('/payment');
  }catch(e){setError(e.message)}finally{preparing.current=false;setBusy(false)}
 };
 const addressSubmit=e=>{e.preventDefault();if(!valid(address)){setError('Please enter valid delivery details.');return}save('nl_address',address);setError('');go('/order-summary')};
 const openPayment=()=>{
  if(!payment)return;
  const android=/Android/i.test(navigator.userAgent);
  const target=method==='phonepe'?payment.phonepeUrl:android?payment.paytmUrl:payment.upiUrl;
  setLaunched(true);window.location.href=target;
 };
 const buttonText=step===0?'CONTINUE':step===1?(busy?'PREPARING…':'CONTINUE TO PAYMENT'):method==='qr'?'SHOW PAYMENT QR':`PAY ${money(details.total)}`;
 const emptyBag=!lines.length;
 return <main className="checkout-shell"><header className="checkout-heading"><button aria-label="Go back" onClick={()=>go(step===0?'/cart':step===1?'/address':'/order-summary')}><ArrowLeft size={22}/></button><div><h1>{step===0?'Delivery address':step===1?'Order summary':'Payments'}</h1><span><ShieldCheck size={12}/> Secure checkout</span></div></header>
  <nav className="checkout-steps" aria-label="Checkout progress">{['Address','Order summary','Payment'].map((label,i)=><button key={label} aria-current={step===i?'step':undefined} disabled={i>step} onClick={()=>{setError('');go(i===0?'/address':i===1?'/order-summary':'/payment')}}><span className={i<=step?'active':''}>{i<step?<Check size={16}/>:i+1}</span>{label}</button>)}</nav>
  {emptyBag?<section className="checkout-panel"><h2>Your bag is empty</h2><button className="btn btn-dark" onClick={()=>go('/collection/all')}>SHOP PRODUCTS</button></section>:!hydrated?<p>Loading checkout…</p>:step===1&&!valid(address)?<section className="checkout-panel"><h2>Add your delivery address</h2><p>A delivery address is required before payment.</p><button className="btn btn-dark" onClick={()=>go('/address')}>ADD ADDRESS</button></section>:<>
   <div className="checkout-columns"><div>
    {step===0?<form id="delivery-form" className="checkout-panel address-panel" onSubmit={addressSubmit}><h2><MapPin size={19}/> Where should we deliver?</h2><p>Enter your contact and delivery details.</p><div className="form-grid">{Object.entries({name:'Full name',phone:'Mobile number',address:'House, street & area',city:'City',state:'State',pincode:'PIN code'}).map(([key,label])=><label key={key} className={key==='address'?'wide':''}>{label}<input required autoComplete={{name:'name',phone:'tel',address:'street-address',city:'address-level2',state:'address-level1',pincode:'postal-code'}[key]} maxLength={key==='address'?300:key==='phone'?10:key==='pincode'?6:100} pattern={key==='phone'?'[0-9]{10}':key==='pincode'?'[0-9]{6}':undefined} inputMode={['phone','pincode'].includes(key)?'numeric':'text'} value={address[key]} onChange={e=>setAddress({...address,[key]:e.target.value})}/></label>)}</div></form>:step===1?<>
     <section className="checkout-panel delivery-review"><div><h2>Deliver to {address.name}</h2><button onClick={()=>go('/address')}>Change</button></div><p>{address.address}, {address.city}, {address.state} – {address.pincode}</p><p>{address.phone}</p></section>
     <section className="checkout-panel review-items"><h2>Your items ({itemCount})</h2>{lines.map(x=><div className="review-item" key={x.key}><img src={x.product.images[0]} alt={x.product.title}/><div><h3>{x.product.title}</h3><p>{x.size} / {x.color} · Qty {x.qty}</p><strong>{money(x.product.price*x.qty)}</strong></div></div>)}<button className="checkout-text-link" onClick={()=>go('/cart')}>Edit shopping bag</button></section>
    </>:<section className="checkout-panel payment-options">{error&&<div className="checkout-error" role="alert"><p>{error}</p><button className="checkout-text-link" onClick={()=>go('/address')}>Review address</button></div>}<div className="payment-intro"><span>UPI PAYMENTS</span><h2>Choose how to pay</h2><p>Pay directly from your preferred UPI app.</p></div>{[{id:'phonepe',name:'PhonePe',hint:'Open the PhonePe app',mark:'पे'},{id:'paytm',name:'Paytm',hint:'Open the Paytm app',mark:'paytm'},{id:'qr',name:'Scan QR',hint:'Scan using any UPI app',mark:'qr'}].map(m=><button className={'payment-option '+(method===m.id?'selected':'')} key={m.id} aria-pressed={method===m.id} onClick={()=>{setMethod(m.id);setError('')}}><span className={'payment-logo '+m.id}>{m.mark==='qr'?<QrCode size={28}/>:m.mark}</span><span><strong>{m.name}</strong><small>{m.hint}</small></span><span className="payment-radio">{method===m.id&&<Check size={12}/>}</span></button>)}
     {!payment?<div className="payment-help"><p>Your payment session needs to be prepared.</p><button className="btn btn-dark" onClick={prepare} disabled={busy}>{busy?'PREPARING…':'PREPARE PAYMENT'}</button></div>:<><div className="payment-payee"><ShieldCheck size={16}/><span>Paying <b>{payment.payee}</b><small>{payment.upiId} · Ref: {payment.id}</small></span></div>{method==='qr'&&<div className="payment-qr" id="payment-qr"><img src={payment.qr} alt={`UPI QR to pay ${money(payment.total)} to ${payment.payee}`}/><b>{money(payment.total)}</b><p>Scan with any UPI app. Check the payee and amount before approving.</p></div>}{(launched||payment)&&<div className="payment-pending" role="status"><strong>{verification==='success'?'Payment verified — redirecting…':'Checking payment status'}</strong>{verificationError&&<p>{verificationError}</p>}<p>If you completed payment, keep your UPI transaction reference. We are checking the bank transaction record. Do not pay again while verification is pending.</p><p>If the app did not open, choose Scan QR or use the UPI app chooser below.</p></div>}<p className="payment-help">PhonePe opens through its native payment link. If your device does not support it, use the UPI chooser or scan the QR.</p><a className="checkout-text-link" href={payment.upiUrl} onClick={()=>setLaunched(true)}>Open UPI app chooser <Smartphone size={15}/></a></>}
    </section>}
   </div><aside>{priceDetails}<p className="checkout-trust"><ShieldCheck size={16}/> Pay only after checking the recipient in your UPI app.</p></aside></div>
   {error&&step!==2&&<p className="checkout-error" role="alert">{error}</p>}
   <div className="flow-bottom-bar"><div><small>Total payable</small><strong>{money(details.total)}</strong></div>{step===0?<button className="btn btn-dark" type="submit" form="delivery-form">{buttonText}<ArrowRight size={17}/></button>:<button className="btn btn-dark" disabled={busy||(step===2&&(!payment||verification==='success'))} onClick={()=>{if(step===1){setError('');go('/payment')}else if(method==='qr')document.getElementById('payment-qr')?.scrollIntoView({behavior:'smooth',block:'center'});else openPayment()}}>{buttonText}<ArrowRight size={17}/></button>}</div>
  </>}
 </main>;
}
