"use client";
import {useState} from "react";
export function Watch({id,tiers}:{id:string,tiers:string[]}){
 const [message,set]=useState("");
 return <form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{const r=await fetch("/api/market",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"watch",eventId:id,tier:f.get("tier"),price:f.get("price")})});set(r.ok?"Watch saved. Check My trades for alerts.":r.status===403||r.status===401?"Sign in on the exchange to save a watch.":"Couldn’t save this watch.")}catch{set("Couldn’t reach the exchange.")}}}><h2>Watch a price</h2><label>Ticket type<select name="tier">{(tiers.length?tiers:["Standard"]).map(t=><option key={t}>{t}</option>)}</select></label><label>Notify me at or below (£)<input type="number" name="price" step=".01" min="0" max="10000" required/></label><button>Save watch</button><p role="status">{message}</p></form>
}
