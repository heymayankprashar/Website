import {initialEvents} from "../../../lib/event-info";
import {env} from "cloudflare:workers";
import { z } from "zod";

const eventQuery = `query PlotTwistEvent($id: ID!) {
  event(id: $id) {
    photo { url } flyer { url } name startDate location { name }
    registration { options { name price { amount currency } } }
  }
}`;
const resultSchema = z.object({
  photo:z.object({url:z.string().nullable()}).nullable().optional(), flyer:z.object({url:z.string().nullable()}).nullable().optional(),
  name: z.string().trim().min(1).max(90),
  startDate: z.string().datetime({ offset: true }),
  location: z.object({ name: z.string().nullable() }).nullable(),
  registration: z.object({ options: z.array(z.object({
    name: z.string().trim().min(1).max(50),
    price: z.object({ amount: z.coerce.number(), currency: z.string() }).nullable()
  })).nullable() }).nullable()
});
function eventId(input: string) {
  const url = new URL(input);
  const short=/^\/2ka\/r(\d+)\/?$/.exec(url.pathname);
  if(url.origin==="https://e.cglink.me" && short && !url.username && !url.password)return btoa("clubs:Event:"+short[1]);
  if (url.origin !== "https://clubs.london.edu" || url.username || url.password) return null;
  const legacy = /^\/rsvp\/?$/i.test(url.pathname) ? url.searchParams.get("id") : url.pathname.match(/^\/[^/]+\/rsvp_boot\/?$/i) ? url.searchParams.get("id") : null;
  if (legacy && /^\d+$/.test(legacy)) return btoa("clubs:Event:" + legacy);
  const code = /^\/w\/[^/]+\/[^/]+\/events\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  if (!code) return null;
  const decoded = atob(decodeURIComponent(code));
  return /^clubs:Event:\d+$/.test(decoded) ? btoa(decoded) : null;
}
const fail=(error:string,status:number)=>Response.json({error},{status});
export async function GET(request:Request) {
  const input=new URL(request.url).searchParams.get("url")??"";
  const pf=/^https:\/\/partiful\.com\/e\/([A-Za-z0-9_-]{1,80})\/?(?:[?#].*)?$/.exec(input);
  if(pf){
    const id="pf-"+pf[1];
    try{
      const response=await fetch("https://partiful.com/e/"+pf[1],{redirect:"manual",signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error();
      const html=await response.text();
      const raw=/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
      const e=JSON.parse(raw??"{}").props?.pageProps?.event;
      if(!e||e.id!==pf[1]||typeof e.title!=="string"||!Number.isFinite(Date.parse(e.startDate)))throw Error();
      if(Date.parse(e.startDate)<=Date.now())return fail("This event has already started.",410);
      const seed=initialEvents.find(x=>x.id===id);
      const data={id,name:e.title.slice(0,90),startDate:e.startDate,venue:seed?.venue??e.locationInfo?.neighborhood??null,image:seed?.image??(typeof e.image?.url==="string"&&e.image.url.startsWith("https://")?e.image.url:null),tiers:seed?.tiers??[]};
      await env.DB!.prepare("INSERT OR REPLACE INTO events(id,name,start,venue,image,tiers) VALUES(?,?,?,?,?,?)").bind(id,data.name,Date.parse(data.startDate),data.venue,data.image,JSON.stringify(data.tiers)).run();
      return Response.json(data);
    }catch{return fail("Partiful did not return public event details. Enter them manually.",422)}
  }
  let id;
  try { id=eventId(new URL(request.url).searchParams.get("url") ?? ""); } catch { id=null; }
  if (!id) return fail("Paste an LBS CampusGroups or Partiful event link.",400);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch("https://clubs.london.edu/api/v2/graphql",{
      method:"POST",redirect:"manual",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({query:eventQuery,variables:{id}}),signal:controller.signal
    });
    if(!response.ok)throw Error("Upstream HTTP "+response.status);
    const body=await response.json() as {data?:{event?:unknown}};
    const event=resultSchema.safeParse(body.data?.event);
    if(!event.success)return fail("CampusGroups didn’t return public event details. You can enter them manually.",422);
    const {name,startDate,location,registration}=event.data;
    if(Date.parse(startDate)<=Date.now())return fail("This event has already started.",410);
    const numericId=atob(id).split(":").pop()!;
    const image=event.data.photo?.url??event.data.flyer?.url??null;
    const tiers=registration?.options??[];
    await env.DB!.prepare("INSERT INTO events(id,name,start,venue,tiers,image) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,start=excluded.start,venue=excluded.venue,tiers=excluded.tiers,image=excluded.image").bind(numericId,name,Date.parse(startDate),location?.name??null,JSON.stringify(tiers),image).run();
    return Response.json({id:numericId,image,name,startDate,venue:location?.name,tiers});
  }catch(error){
    console.warn("CampusGroups lookup failed",error instanceof Error?error.message:"Network error");
    return fail("CampusGroups couldn’t be reached. Try again or enter the details manually.",502);
  } finally {clearTimeout(timer)}
}
