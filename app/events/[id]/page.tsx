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
 return <main style={{maxWidth:780,margin:"auto",padding:"2rem"}}><a href="/">← Plot Twist exchange</a><h1>{e.name}</h1>{e.image&&<img src={e.image} alt={e.name+" event artwork"} style={{width:"100%",maxHeight:360,objectFit:"contain"}}/>}<p>{new Date(e.startDate).toLocaleString("en-GB",{timeZone:"Europe/London",dateStyle:"full",timeStyle:"short"})} London time · {e.venue}</p>{id==="pf-C825B7GCrs25QDCdpgxg"&&<p>The invitation lists 24 November in the calendar and 25 November in the description. Confirm the date with the host. Orders close on 24 November at 20:00.</p>}<a href={source(id)}>Organizer’s event page ↗</a><p>{e.tiers.map(t=>t.name+(t.price?" · "+t.price.currency+" "+t.price.amount:"")).join(" / ")}</p><p>{counts?.total? (counts.timely??0)+" of "+counts.total+" matched tickets were confirmed before the event.":"No matched tickets yet."}</p><div className="filters"><a className="primary" href={"/?order=buy&id="+id}>Place a bid</a><a className="secondary" href={"/?order=sell&id="+id}>Sell a ticket</a></div><Watch id={id} tiers={e.tiers.map(t=>t.name)}/></main>
}
