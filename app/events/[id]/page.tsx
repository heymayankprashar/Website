import {catalog} from "../../../lib/catalog";
import {source} from "../../../lib/event-info";
import {env} from "cloudflare:workers";
import {notFound} from "next/navigation";
import {Watch} from "./watch";
export default async function EventPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const e=(await catalog()).find(row=>row.id===id);
 if(!e)notFound();
 const counts=await env.DB!.prepare("SELECT count(*) total,sum(d.state='complete' AND d.finished<=?) timely FROM deals d JOIN listings l ON l.id=d.listing WHERE (l.eventId=? OR (?='44213' AND l.eventId IS NULL AND lower(trim(l.event))='afro party')) AND (d.matched IS NOT NULL OR d.state IN ('reserved','sent','complete','disputed'))").bind(Date.parse(e.startDate),id,id).first<{total:number,timely:number}>();
 const start=new Date(e.startDate);
 return <main className="eventShell">
 <div className="eventNav"><a href="/">← Ticket exchange</a><strong>Plot Twist</strong></div>
 <section className="eventHero">
 {e.image&&<div className="eventArt"><img src={e.image} alt={e.name+" event artwork"}/></div>}
 <div className="eventInfo"><h1>{e.name}</h1>
 <p><time dateTime={e.startDate}>{start.toLocaleDateString("en-GB",{timeZone:"Europe/London",weekday:"short",day:"numeric",month:"long",year:"numeric"})} · {start.toLocaleTimeString("en-GB",{timeZone:"Europe/London",hour:"2-digit",minute:"2-digit"})} London time</time></p>
 {e.venue&&<p>{e.venue}</p>}{id==="pf-C825B7GCrs25QDCdpgxg"&&<p>The invitation lists 24 November in the calendar and 25 November in the description. Confirm the date with the host. Orders close on 24 November at 20:00.</p>}
 <a className="organizerLink" href={source(id)}>View on {id.startsWith("pf-")?"Partiful":"CampusGroups"} ↗</a>
 {e.tiers.length>0&&<dl className="eventTiers"><dt>Face value</dt>{e.tiers.map(t=><dd key={t.name}>{t.name}{t.price&&<b>{new Intl.NumberFormat("en-GB",{style:"currency",currency:t.price.currency,maximumFractionDigits:2,minimumFractionDigits:0}).format(t.price.amount)}</b>}</dd>)}</dl>}
 <div className="eventActions"><a href={"/?order=buy&id="+id}>Place a bid</a><a href={"/?order=sell&id="+id}>Sell a ticket</a></div>
 <p>{counts?.total? (counts.timely??0)+" of "+counts.total+" matched tickets were confirmed before the event.":"No matched tickets yet."}</p></div></section><Watch id={id} tiers={e.tiers.map(t=>t.name)}/></main>
}
