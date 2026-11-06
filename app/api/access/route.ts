import {env} from "cloudflare:workers";
import {getChatGPTUser} from "../../chatgpt-auth";
import {cookies} from "next/headers";
import {z} from "zod";
import {adminEmail,cookieName,digest} from "../../../lib/student-access";
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("issue"),email:z.string().trim().toLowerCase().email().regex(/^[^@\s]+@london\.edu$/)}),
 z.object({action:z.literal("verify"),code:z.string().trim().min(16).max(80)}),
 z.object({action:z.literal("logout")})
]);
const reply=(v:unknown,status=200,extra:Record<string,string>={})=>Response.json(v,{status,headers:{"Cache-Control":"no-store",...extra}});
export async function POST(req:Request){
 if(req.headers.get("origin")!==new URL(req.url).origin)return reply({error:"Invalid origin"},403);
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return reply({error:"Check the LBS email address or approval code."},400);
 const p=parsed.data,db=env.DB!,now=Date.now();
 if(p.action==="issue"){
  const user=await getChatGPTUser();
  if(user?.email.toLowerCase()!==adminEmail)return reply({error:"Sign in with the designated reviewer account."},403);
  const code=crypto.randomUUID();
  await db.batch([db.prepare("DELETE FROM invites WHERE email=? OR expires<=?").bind(p.email,now),db.prepare("INSERT INTO invites VALUES(?,?,?)").bind(await digest(code),p.email,now+86400000)]);
  return reply({code});
 }
 if(p.action==="logout"){
  const token=(await cookies()).get(cookieName)?.value;
  if(token)await db.prepare("DELETE FROM sessions WHERE digest=?").bind(await digest(token)).run();
  return reply({ok:true},200,{"Set-Cookie":cookieName+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"});
 }
 const key=await digest(p.code),token=crypto.randomUUID()+crypto.randomUUID(),age=30*86400;
 const result=await db.batch([db.prepare("INSERT INTO sessions(digest,email,expires) SELECT ?,email,? FROM invites WHERE digest=? AND expires>?").bind(await digest(token),now+age*1000,key,now),db.prepare("DELETE FROM invites WHERE digest=?").bind(key)]);
 if(!result[0].meta.changes)return reply({error:"That code has expired or has already been used. Request a fresh code."},403);
 return reply({ok:true},200,{"Set-Cookie":cookieName+"="+token+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+age});
}
