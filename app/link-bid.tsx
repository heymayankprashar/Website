"use client";
import {useEffect,useState} from "react";

type ImportedEvent={name:string,startDate:string,venue?:string,tiers:{name:string,price:{amount:number,currency:string}|null}[]};
type Props={busy:boolean,post:(values:Record<string,unknown>)=>Promise<void>,manual:()=>void};

export function LinkBid({busy,post,manual}:Props){
 const [url,setUrl]=useState(""),[event,setEvent]=useState<ImportedEvent|null>(null);
 const [error,setError]=useState(""),[loading,setLoading]=useState(false);
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
    setEvent(data);
   }catch(e){if(!controller.signal.aborted)setError((e as Error).message)}
   finally{if(!controller.signal.aborted)setLoading(false)}
  },300);
  return ()=>{clearTimeout(timer);controller.abort()};
 },[url]);
 return <><h2>Post a buyer bid</h2><label>CampusGroups event link<input type="url" autoFocus value={url} placeholder="Paste the LBS event link" onChange={e=>{setEvent(null);setError("");setLoading(false);setUrl(e.target.value)}}/></label>
 {loading&&<p role="status">Looking up the event…</p>}{error&&<p role="alert">{error}</p>}
 {event&&<form key={event.name+event.startDate} onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);void post({event:event.name,side:"buy",tier:form.get("tier"),price:form.get("price"),deadline:Date.parse(event.startDate)})}}>
 <div><h3>{event.name}</h3><p>{event.venue}</p></div>
 <label>Ticket type{event.tiers.length?<select name="tier">{event.tiers.map(t=><option key={t.name} value={t.name}>{t.name}{t.price?" · face value "+new Intl.NumberFormat("en-GB",{style:"currency",currency:t.price.currency}).format(t.price.amount):""}</option>)}</select>:<input name="tier" defaultValue="Standard" maxLength={50} required/>}</label>
 <label>Your offer for one ticket (£)<input name="price" type="number" min="0" max="10000" step=".01" required/></label>
 <small>Bid expires at the event start, {new Date(event.startDate).toLocaleString("en-GB",{timeZone:"Europe/London",dateStyle:"medium",timeStyle:"short"})} London time.</small>
 <button className="primary" disabled={busy}>{busy?"Posting…":"Post my bid"}</button></form>}
 <p><button className="textbutton" onClick={manual}>Enter event details manually</button></p></>
}
