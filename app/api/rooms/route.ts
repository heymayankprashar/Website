import {student} from "../../../lib/student-access";
import {env} from "cloudflare:workers";
import {catalog} from "../../../lib/catalog";
const eligible="SELECT eventId FROM listings WHERE owner=? UNION SELECT l.eventId FROM listings l JOIN deals d ON d.listing=l.id WHERE d.buyer=? OR d.seller=?";
export async function GET(req:Request){
 const me=await student();if(!me)return new Response(null,{status:403});
 const db=env.DB!,id=new URL(req.url).searchParams.get("id");
 const allowed=await db.prepare(eligible).bind(me,me,me).all<{eventId:string}>();
 const joined=await db.prepare("SELECT eventId FROM roomMembers WHERE owner=?").bind(me).all<{eventId:string}>();
 const rooms=(await catalog()).filter(e=>allowed.results.some(r=>r.eventId===e.id)).map(e=>({id:e.id,name:e.name,joined:joined.results.some(r=>r.eventId===e.id)}));
 const posts=id&&rooms.some(r=>r.id===id&&r.joined)?(await db.prepare("SELECT p.body,a.username,p.created FROM roomPosts p JOIN accounts a ON a.principal=p.owner WHERE eventId=? ORDER BY created DESC LIMIT 100").bind(id).all()).results.reverse():[];
 return Response.json({rooms,posts},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req:Request){
 const me=await student();if(!me||req.headers.get("origin")!==new URL(req.url).origin)return new Response(null,{status:403});
 const {id,action,body}=await req.json() as {id:string,action:string,body?:string},db=env.DB!;
 if(!(await catalog()).some(e=>e.id===id))return new Response(null,{status:404});
 if(action==="join"){
 const r=await db.prepare("INSERT OR IGNORE INTO roomMembers SELECT ?,?,? WHERE ? IN ("+eligible+")").bind(JSON.stringify([me,id]),id,me,id,me,me,me).run();
 return Response.json({joined:!!r.meta.changes});
 }
 if(action==="leave"){await db.prepare("DELETE FROM roomMembers WHERE owner=? AND eventId=?").bind(me,id).run();return Response.json({ok:true})}
 if(action!=="post"||typeof body!=="string"||!body.trim()||body.length>700||/(https?:\/\/|www\.)/i.test(body))return Response.json({error:"Use private chat for links. Group messages can contain up to 700 characters."},{status:400});
 const r=await db.prepare("INSERT INTO roomPosts SELECT ?,eventId,owner,?,? FROM roomMembers WHERE eventId=? AND owner=?").bind(crypto.randomUUID(),body.trim(),Date.now(),id,me).run();
 return new Response(null,{status:r.meta.changes?204:403});
}
