import {env} from "cloudflare:workers";
import {getChatGPTUser} from "../../chatgpt-auth";
import {cookies} from "next/headers";
import {z} from "zod";
import {adminEmail,cookieName,digest} from "../../../lib/student-access";
import {mbaAddress} from "../../../lib/eligibility";
const address=z.string().trim().toLowerCase().email().max(254).regex(mbaAddress);
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("issue"),email:address}),
 z.object({action:z.literal("verify"),code:z.string().trim().min(16).max(80)}),
 z.object({action:z.literal("request"),email:address}),
 z.object({action:z.literal("logout")})
]);
const reply=(v:unknown,status=200,extra:Record<string,string>={})=>Response.json(v,{status,headers:{"Cache-Control":"no-store",...extra}});
export async function POST(req:Request){
 if(req.headers.get("origin")!==new URL(req.url).origin)return reply({error:"Invalid origin"},403);
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return reply({error:"Use your MBA address ending in @london.edu, or request a fresh sign-in link."},400);
 const p=parsed.data,db=env.DB!,now=Date.now();
 if(p.action==="issue" || p.action==="request"){
  const manual=p.action==="issue";
  if(manual && (await getChatGPTUser())?.email.toLowerCase()!==adminEmail)return reply({error:"Reviewer access required."},403);
  if(!manual && (!env.RESEND_API_KEY || !env.PLOT_TWIST_FROM))return reply({manual:true});
  const code=crypto.randomUUID(),key=await digest(code),life=15*60_000;
  const link=new URL("/",req.url);link.hash="signin="+code;
  // Reserve delivery atomically to prevent duplicate mail on concurrent retries.
  const created=await db.prepare("INSERT INTO invites(digest,email,expires) SELECT ?,?,? WHERE ? OR NOT EXISTS(SELECT 1 FROM invites WHERE email=? AND expires>?)").bind(key,p.email,now+life,manual?1:0,p.email,now+life-60_000).run();
  if(!created.meta.changes)return reply({error:"A link was requested recently. Check your inbox or try again in a minute."},429);
  if(manual)return reply({link:link.href});
  try{
   const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:env.PLOT_TWIST_FROM,to:[p.email],subject:"Your Plot Twist sign-in link",text:"Sign in to Plot Twist: "+link.href+"\n\nThis link works once and expires in 15 minutes."})});
   if(!sent.ok)throw Error("delivery");
   return reply({sent:true});
  }catch{
   await db.prepare("DELETE FROM invites WHERE digest=?").bind(key).run();
   return reply({manual:true});
  }
 }
 if(p.action==="logout"){
  const token=(await cookies()).get(cookieName)?.value;
  if(token)await db.prepare("DELETE FROM sessions WHERE digest=?").bind(await digest(token)).run();
  return reply({ok:true},200,{"Set-Cookie":cookieName+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"});
 }
 const key=await digest(p.code),token=crypto.randomUUID()+crypto.randomUUID(),age=30*86400;
 const result=await db.batch([db.prepare("INSERT INTO sessions(digest,email,expires) SELECT ?,email,? FROM invites WHERE digest=? AND expires>? AND lower(email) LIKE '%mba%@london.edu'").bind(await digest(token),now+age*1000,key,now),db.prepare("DELETE FROM invites WHERE digest=?").bind(key)]);
 if(!result[0].meta.changes)return reply({error:"That code has expired or has already been used. Request a fresh code."},403);
 return reply({ok:true},200,{"Set-Cookie":cookieName+"="+token+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+age});
}
