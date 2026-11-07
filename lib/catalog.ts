import {env} from "cloudflare:workers";
import {initialEvents,stillOnBoard} from "./event-info";
export async function catalog(){
 const items=await env.DB!.prepare("SELECT * FROM events ORDER BY start").all<{id:string,name:string,start:number,description:string|null,image:string|null,venue:string|null,tiers:string}>();
 const all=new Map(initialEvents.map(e=>[e.id,e]));
 for(const row of items.results)all.set(row.id,{id:row.id,name:row.name,startDate:new Date(row.start).toISOString(),description:row.description,image:row.image??all.get(row.id)?.image,venue:row.venue,tiers:JSON.parse(row.tiers)});
 return [...all.values()].filter(stillOnBoard);
}
