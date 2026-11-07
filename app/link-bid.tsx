"use client";
import {useEffect,useState} from "react";

type ImportedEvent={id:string,name:string,startDate:string,venue?:string,tiers:{name:string,price:{amount:number,currency:string}|null}[]};
type Props={initialUrl?:string,side:string,listings:{event:string,tier:string,side:string,price:number,mine?:number}[],busy:boolean,post:(values:Record<string,unknown>)=>Promise<void>,manual:()=>void};

export function LinkBid({busy,post,manual,side,listings,initialUrl}:Props){
 const [tier,setTier]=useState(""),[amount,setAmount]=useState("");
 const buying=side==="buy";
 const [url,setUrl]=useState(initialUrl??""),[event,setEvent]=useState<ImportedEvent|null>(null);
 const [error,setError]=useState(""),[loading,setLoading]=useState(false);
 const opposing=listings.filter(l=>eventMatches(l)&&!l.mine&&l.side!==side).map(l=>l.price);
 function eventMatches(l:Props["listings"][number]){return !!event&&l.event.toLowerCase()===event.name.toLowerCase()&&l.tier.toLowerCase()===tier.toLowerCase()}
 const best=buying?Math.min(...opposing):Math.max(...opposing);
 const gap=buying?best-Math.round(Number(amount)*100):Math.round(Number(amount)*100)-best;
 useEffect(()=>{
  const link=url.trim();
  if(!link)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setLoading(true);
   try{
    const response=await fetch("/api/campus-event?url="+encodeURIComponent(link),{signal:controller.signal});
    const data=await response.json() as ImportedEvent & {error?:string};
    if(!response.ok)throw Error(data.error||"Couldn’t import this event.");
    setEvent(data);setTier(data.tiers[0]?.name??"Standard");setAmount("");
   }catch(e){if(!controller.signal.aborted)setError((e as Error).message)}
   finally{if(!controller.signal.aborted)setLoading(false)}
  },300);
  return ()=>{clearTimeout(timer);controller.abort()};
 },[url]);
 return <><h2>{buying?"Post a buyer bid":"List a ticket for sale"}</h2><label>CampusGroups or Partiful link<input type="url" autoFocus value={url} placeholder="Paste the event link" onChange={e=>{setEvent(null);setError("");setLoading(false);setUrl(e.target.value)}}/></label>
 {loading&&<p role="status">Looking up the event…</p>}{error&&<p role="alert">{error}</p>}
 {event&&<form key={event.name+event.startDate} onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void post({event:event.name,eventId:event.id,side,tier:form.get("tier"),price:form.get("price"),deadline:Date.parse(event.startDate)})}}>
 <div><h3>{event.name}</h3><p>{event.venue}</p></div>
 <label>Ticket type{event.tiers.length?<select name="tier" value={tier} onChange={e=>setTier(e.target.value)}>{event.tiers.map(t=><option key={t.name} value={t.name}>{t.name}{t.price?" · face value "+new Intl.NumberFormat("en-GB",{style:"currency",currency:t.price.currency}).format(t.price.amount):""}</option>)}</select>:<input name="tier" value={tier} onChange={e=>setTier(e.target.value)} maxLength={50} required/>}</label>
 <label>{buying?"Your bid (£)":"Your asking price (£)"}<input name="price" value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0" max="10000" step=".01" required/></label>
 {opposing.length>0&&<p>{buying?"Lowest ask":"Highest bid"} £{((buying?Math.min(...opposing):Math.max(...opposing))/100).toFixed(2)}. {amount!==""?(gap>0?"Change your price by £"+(gap/100).toFixed(2)+" to match now, or leave it open.":"Your price can match now."):"Compatible prices match immediately."}</p>}<small>Order expires at the event start, {new Date(event.startDate).toLocaleString("en-GB",{timeZone:"Europe/London",dateStyle:"medium",timeStyle:"short"})} London time.</small>
 <button className="primary" disabled={busy}>{busy?"Posting…":buying?"Post my bid":"List my ticket"}</button></form>}
 <p><button className="textbutton" onClick={manual}>Enter event details manually</button></p></>
}
