import {env} from "cloudflare:workers";
import {student} from "../../../lib/student-access";
import {z} from "zod";
export async function POST(req:Request){
 const owner=await student();
 if(!owner||req.headers.get("origin")!==new URL(req.url).origin)return new Response(null,{status:403});
 const schema=z.object({key:z.string().uuid(),name:z.string().trim().min(1).max(90),description:z.string().trim().min(1).max(1500),venue:z.string().trim().min(1).max(120),start:z.number().int().min(Date.now()+1),quantity:z.number().int().min(1).max(50),price:z.number().int().min(0).max(1000000),image:z.string().max(500000).regex(/^(?:|data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+)$/)});
 const parsed=schema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"Check the date, ticket details and cover photo."},{status:400});
 const p=parsed.data,id="hp-"+p.key,db=env.DB!;
 const existing=await db.prepare("SELECT owner FROM listings WHERE eventId=? LIMIT 1").bind(id).first<{owner:string}>();
 if(existing)return Response.json({id},{status:existing.owner===owner?200:409});
 const batch=[db.prepare("INSERT INTO events(id,name,start,description,venue,image,tiers) VALUES(?,?,?,?,?,?,?)").bind(id,p.name,p.start,p.description,p.venue,p.image?"/api/covers/"+id:null,JSON.stringify([{name:"Entry",price:{amount:p.price/100,currency:"GBP"}}]))];
 if(p.image)batch.push(db.prepare("INSERT INTO covers VALUES(?,?)").bind(id,p.image.split(",")[1]));
 for(let i=0;i<p.quantity;i++)batch.push(db.prepare("INSERT INTO listings(id,eventId,owner,event,tier,deadline,side,price) VALUES(?,?,?,?,'Entry',?,'sell',?)").bind(crypto.randomUUID(),id,owner,p.name,p.start,p.price));
 await db.batch(batch);
 return Response.json({id});
}
