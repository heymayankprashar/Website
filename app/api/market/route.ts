import {env} from "cloudflare:workers";
import {student as identity} from "../../../lib/student-access";
import {z} from "zod";
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){
 const me=await identity();
 if(!me)return reply({member:false,listings:[],deals:[],sales:[]});
 const db=env.DB!, now=Date.now();
 const [listings,deals,sales]=await db.batch([
 db.prepare("SELECT id,event,tier,deadline,side,price,owner=? AS mine FROM listings WHERE state='open' AND deadline>? ORDER BY deadline").bind(me,now),
 db.prepare("SELECT d.id,d.price,d.state,d.revision,d.wallet,d.buyer=? AS buying,d.author=? AS lastByMe,l.event,l.tier,l.deadline,l.state AS availability FROM deals d JOIN listings l ON l.id=d.listing WHERE buyer=? OR seller=? ORDER BY d.rowid DESC").bind(me,me,me,me),
 db.prepare("SELECT l.event,l.tier,l.deadline,d.price,d.finished FROM deals d JOIN listings l ON l.id=d.listing WHERE d.state='complete' ORDER BY finished DESC")]);
 return reply({member:true,listings:listings.results,deals:deals.results,sales:sales.results});
}
export async function POST(req:Request){
 const me=await identity();if(!me)return reply({error:"Sign in with your LBS account to trade."},403);
 if(req.headers.get("origin")!==new URL(req.url).origin)return reply({error:"Invalid origin"},403);
 const input=z.object({action:z.string(),price:z.union([z.string(),z.number()]).optional(),event:z.string().default(""),tier:z.string().default(""),side:z.string().default(""),deadline:z.number().default(0),id:z.string().default(""),revision:z.number().int().default(-1),wallet:z.string().default(""),issue:z.string().default("")}).safeParse(await req.json().catch(()=>null));
 if(!input.success)return reply({error:"Invalid request."},400);
 const p=input.data, db=env.DB!, now=Date.now(), cents=Math.round(Number(p.price)*100);
 const valid=Number.isSafeInteger(cents)&&cents>=0&&cents<=1000000&&String(p.price).trim()!=="";
 const str=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.length<=max;
 const stale=()=>reply({error:"This offer has changed or expired. Refresh and try again."},409);
 if(p.action==="list"){
 if(!str(p.event,90)||!str(p.tier,50)||!Number.isSafeInteger(p.deadline)||p.deadline<=now||!["buy","sell"].includes(p.side)||!valid)return reply({error:"Check the event, price and transfer deadline."},400);
 await db.prepare("INSERT INTO listings(id,owner,event,tier,deadline,side,price) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(),me,p.event.trim(),p.tier.trim(),p.deadline,p.side,cents).run();return reply({ok:true});
 }
 if(p.action==="withdraw"){
 const r=await db.prepare("UPDATE listings SET state='withdrawn' WHERE id=? AND owner=? AND state='open'").bind(p.id,me).run();return r.meta.changes?reply({ok:true}):stale()
 }
 if(p.action==="offer"&&valid){
 const r=await db.prepare("INSERT INTO deals(id,listing,buyer,seller,author,price,state) SELECT ?,id,CASE WHEN side='sell' THEN ? ELSE owner END,CASE WHEN side='buy' THEN ? ELSE owner END,?,?,'pending' FROM listings WHERE id=? AND owner<>? AND state='open' AND deadline>? AND NOT EXISTS(SELECT 1 FROM deals WHERE listing=listings.id AND (buyer=? OR seller=?) AND state='pending')").bind(crypto.randomUUID(),me,me,me,cents,p.id,me,now,me,me).run();return r.meta.changes?reply({ok:true}):stale()
 }
 const base=" WHERE id=? AND revision=? AND (buyer=? OR seller=?)";
 const args=[p.id,p.revision,me,me];
 const live=" AND state='pending' AND author<>? AND EXISTS(SELECT 1 FROM listings WHERE id=deals.listing AND state='open' AND deadline>?)";
 if(p.action==="accept"){
 const result=await db.batch([db.prepare("UPDATE deals SET state='reserved',revision=revision+1"+base+live).bind(...args,me,now),db.prepare("UPDATE listings SET state='reserved' WHERE state='open' AND id=(SELECT listing FROM deals WHERE id=? AND state='reserved' AND (buyer=? OR seller=?))").bind(p.id,me,me)]);
 return result[0].meta.changes?reply({ok:true}):stale()
 }
 let sql="",values:unknown[]=[];
 if(p.action==="counter"&&valid){sql="UPDATE deals SET price=?,author=?,revision=revision+1"+base+live;values=[cents,me,...args,me,now]}
 if(p.action==="close"){sql="UPDATE deals SET state='closed',revision=revision+1"+base+" AND state='pending'";values=args}
 if(p.action==="wallet"&&str(p.wallet,180)){sql="UPDATE deals SET wallet=?,revision=revision+1"+base+" AND seller=? AND state='reserved'";values=[p.wallet.trim(),...args,me]}
 if(p.action==="send"){sql="UPDATE deals SET state='sent',revision=revision+1"+base+" AND seller=? AND state='reserved'";values=[...args,me]}
 if(p.action==="received"){sql="UPDATE deals SET state='complete',wallet=NULL,finished=?,revision=revision+1"+base+" AND buyer=? AND state='sent'";values=[now,...args,me]}
 if(p.action==="report"&&str(p.issue,500)){sql="UPDATE deals SET state='disputed',wallet=NULL,issue=?,revision=revision+1"+base+" AND state IN ('sent','reserved','complete')";values=[p.issue,...args]}
 if(!sql)return reply({error:"Check your entry."},400);
 const result=await db.prepare(sql).bind(...values).run();return result.meta.changes?reply({ok:true}):stale()
}
