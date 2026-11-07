import {env} from "cloudflare:workers";
import {student} from "../../../lib/student-access";
import {keys,pushOrigin} from "../../../lib/alerts";
export async function GET(){
 const me=await student();if(!me)return Response.json({alerts:[]});
 const alerts=await env.DB!.prepare("SELECT body,path,created FROM alerts WHERE owner=? ORDER BY created DESC LIMIT 20").bind(me).all();
 return Response.json({alerts:alerts.results,key:(await keys()).publicKey},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req:Request){
 const me=await student();if(!me||req.headers.get("origin")!==new URL(req.url).origin)return new Response(null,{status:403});
 const p=await req.json() as {endpoint:string,remove?:boolean};
 if(typeof p?.endpoint!=="string"||p.endpoint.length>4096||!pushOrigin(p.endpoint))return new Response(null,{status:400});
 const db=env.DB!;
 if(p.remove)await db.prepare("DELETE FROM pushDevices WHERE endpoint=? AND owner=?").bind(p.endpoint,me).run();
 else await db.prepare("INSERT OR REPLACE INTO pushDevices VALUES(?,?)").bind(p.endpoint,me).run();
 return Response.json({ok:true});
}
