import {env} from "cloudflare:workers";
import {student as identity} from "../../../lib/student-access";
import {z} from "zod";
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(){
 const me=await identity();

 const db=env.DB!, now=Date.now();
 const stats=(await db.prepare(`SELECT l.event, count(*) AS trades,
  (SELECT x.price FROM deals x JOIN listings y ON y.id=x.listing WHERE x.state='complete' AND lower(trim(y.event))=lower(trim(l.event)) ORDER BY x.finished DESC,x.rowid DESC LIMIT 1) AS last
  FROM deals d JOIN listings l ON l.id=d.listing WHERE d.state='complete' GROUP BY lower(trim(l.event)) ORDER BY trades DESC,max(d.finished) DESC`).all()).results;
 const hot=stats.reduce((total,row)=>total+Number(row.trades),0)>=10?stats[0]:null;
 if(!me)return reply({member:false,listings:[],deals:[],sales:[],stats,hot});
 const [listings,deals,sales,profile,leaders,messages]=await db.batch([
 db.prepare("SELECT id,event,tier,deadline,side,price,owner=? AS mine,a.username FROM listings LEFT JOIN accounts a ON a.principal=owner WHERE state='open' AND deadline>? ORDER BY deadline").bind(me,now),
 db.prepare("SELECT d.id,d.price,d.state,d.revision,d.wallet,d.buyer=? AS buying,d.author=? AS lastByMe,l.event,l.tier,l.deadline,l.state AS availability FROM deals d JOIN listings l ON l.id=d.listing WHERE buyer=? OR seller=? ORDER BY d.rowid DESC").bind(me,me,me,me),
 db.prepare("SELECT l.event,l.tier,l.deadline,d.price,d.finished FROM deals d JOIN listings l ON l.id=d.listing WHERE d.state='complete' ORDER BY finished DESC"),
 db.prepare("SELECT username FROM accounts WHERE principal=?").bind(me),
 db.prepare("SELECT a.username, COUNT(DISTINCT lower(trim(l.event))) AS events FROM accounts a JOIN deals d ON d.buyer=a.principal JOIN listings l ON l.id=d.listing WHERE d.state='complete' GROUP BY a.username ORDER BY events DESC,a.username LIMIT 100"),
 db.prepare("SELECT m.id,m.deal,m.body,m.created,m.sender=? AS mine FROM messages m JOIN deals d ON d.id=m.deal WHERE d.buyer=? OR d.seller=? ORDER BY m.created,m.rowid").bind(me,me,me)
 ]);
 return reply({member:true,stats,hot,messages:messages.results,username:(profile.results[0] as {username:string}|undefined)?.username,leaders:leaders.results,listings:listings.results,deals:deals.results,sales:sales.results});
}
export async function POST(req:Request){
 const me=await identity();
 if(req.headers.get("origin")!==new URL(req.url).origin)return reply({error:"Invalid origin"},403);
 const input=z.object({action:z.string(),price:z.union([z.string(),z.number()]).optional(),event:z.string().default(""),tier:z.string().default(""),side:z.string().default(""),deadline:z.number().default(0),id:z.string().default(""),revision:z.number().int().default(-1),wallet:z.string().default(""),issue:z.string().default("")}).safeParse(await req.json().catch(()=>null));
 if(!input.success)return reply({error:"Invalid request."},400);
 const p=input.data, db=env.DB!, now=Date.now(), cents=Math.round(Number(p.price)*100);
 if(p.action==="feedback" && p.issue.trim() && p.issue.length<=1000){
  await db.prepare("INSERT INTO feedback VALUES(?,?,?)").bind(crypto.randomUUID(),p.issue.trim(),now).run();return reply({ok:true})
 }
 if(!me)return reply({error:"Sign in to trade."},403);
 if(p.action==="message" && p.issue.trim() && p.issue.length<=1000){
  const r=await db.prepare("INSERT INTO messages SELECT ?,id,?,?,? FROM deals WHERE id=? AND (buyer=? OR seller=?)").bind(crypto.randomUUID(),me,p.issue.trim(),now,p.id,me,me).run();
  return r.meta.changes?reply({ok:true}):reply({error:"Trade unavailable."},404)
 }
 const valid=Number.isSafeInteger(cents)&&cents>=0&&cents<=1000000&&String(p.price).trim()!=="";
 const str=(v:unknown,max:number)=>typeof v==="string"&&v.trim().length>0&&v.length<=max;
 const stale=()=>reply({error:"This offer has changed or expired. Refresh and try again."},409);
 if(p.action==="list"){
 if(!str(p.event,90)||!str(p.tier,50)||!Number.isSafeInteger(p.deadline)||p.deadline<=now||!["buy","sell"].includes(p.side)||!valid)return reply({error:"Check the event, price and transfer deadline."},400);
 const ticket=crypto.randomUUID(),trade=crypto.randomUUID(),buying=p.side==="buy";
 const compatible=buying?"price<=? ORDER BY price ASC,rowid":"price>=? ORDER BY price DESC,rowid";
 const [matched]=await db.batch([
  db.prepare(`INSERT INTO deals(id,listing,buyer,seller,author,price,state)
    SELECT ?,id,CASE WHEN side='sell' THEN ? ELSE owner END,CASE WHEN side='buy' THEN ? ELSE owner END,?,price,'reserved'
    FROM listings WHERE owner<>? AND side<>? AND lower(trim(event))=lower(?) AND lower(trim(tier))=lower(?)
    AND state='open' AND deadline>? AND ${compatible} LIMIT 1`).bind(trade,me,me,me,me,p.side,p.event.trim(),p.tier.trim(),now,cents),
  db.prepare("UPDATE listings SET state='reserved' WHERE id=(SELECT listing FROM deals WHERE id=?)").bind(trade),
  db.prepare("INSERT INTO listings(id,owner,event,tier,deadline,side,price) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM deals WHERE id=?)").bind(ticket,me,p.event.trim(),p.tier.trim(),p.deadline,p.side,cents,trade)
 ]);
 return reply({ok:true,matched:!!matched.meta.changes});
 }
 if(p.action==="withdraw"){
 const r=await db.prepare("UPDATE listings SET state='withdrawn' WHERE id=? AND owner=? AND state='open'").bind(p.id,me).run();return r.meta.changes?reply({ok:true}):stale()
 }
 if(p.action==="match" || (p.action==="offer"&&valid)){
  const id=crypto.randomUUID();
  const [created]=await db.batch([
   db.prepare("INSERT INTO deals(id,listing,buyer,seller,author,price,state) SELECT ?,id,CASE WHEN side='sell' THEN ? ELSE owner END,CASE WHEN side='buy' THEN ? ELSE owner END,?,price,'reserved' FROM listings WHERE id=? AND owner<>? AND state='open' AND deadline>? AND ((?='match' AND price=?) OR (?='offer' AND ((side='sell' AND price<=?) OR (side='buy' AND price>=?))))").bind(id,me,me,me,p.id,me,now,p.action,cents,p.action,cents,cents),
   db.prepare("UPDATE listings SET state='reserved' WHERE id=(SELECT listing FROM deals WHERE id=?)").bind(id)
  ]);
  if(created.meta.changes)return reply({ok:true,matched:true});
  if(p.action==="match")return stale();
 }
 if(p.action==="offer"&&valid){
 const r=await db.prepare("INSERT INTO deals(id,listing,buyer,seller,author,price,state) SELECT ?,id,CASE WHEN side='sell' THEN ? ELSE owner END,CASE WHEN side='buy' THEN ? ELSE owner END,?,?,'pending' FROM listings WHERE id=? AND owner<>? AND state='open' AND deadline>? AND NOT EXISTS(SELECT 1 FROM deals WHERE listing=listings.id AND (buyer=? OR seller=?) AND state='pending')").bind(crypto.randomUUID(),me,me,me,cents,p.id,me,now,me,me).run();return r.meta.changes?reply({ok:true}):stale()
 }
 const base=" WHERE id=? AND revision=? AND (buyer=? OR seller=?)";
 const args=[p.id,p.revision,me,me];
 const live=" AND state='pending' AND author<>? AND EXISTS(SELECT 1 FROM listings WHERE id=deals.listing AND state='open' AND deadline>?)";
 if(p.action==="accept" || (p.action==="counter"&&valid)){
 const result=await db.batch([db.prepare("UPDATE deals SET state='reserved',revision=revision+1"+base+live+" AND (?='accept' OR (buyer=? AND ?>=price) OR (seller=? AND ?<=price))").bind(...args,me,now,p.action,me,cents||0,me,cents||0),db.prepare("UPDATE listings SET state='reserved' WHERE state='open' AND id=(SELECT listing FROM deals WHERE id=? AND state='reserved' AND (buyer=? OR seller=?))").bind(p.id,me,me)]);
 if(result[0].meta.changes)return reply({ok:true,matched:true});
  if(p.action==="accept")return stale()
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
