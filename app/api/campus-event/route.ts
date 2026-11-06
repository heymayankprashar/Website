import { z } from "zod";

const eventQuery = `query PlotTwistEvent($id: ID!) {
  event(id: $id) {
    name startDate location { name }
    registration { options { name price { amount currency } } }
  }
}`;
const resultSchema = z.object({
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
  let id;
  try { id=eventId(new URL(request.url).searchParams.get("url") ?? ""); } catch { id=null; }
  if (!id) return fail("Paste an LBS CampusGroups event link.",400);
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
    return Response.json({name,startDate,venue:location?.name,tiers:registration?.options??[]});
  }catch(error){
    console.warn("CampusGroups lookup failed",error instanceof Error?error.message:"Network error");
    return fail("CampusGroups couldn’t be reached. Try again or enter the details manually.",502);
  } finally {clearTimeout(timer)}
}
