import {env} from "cloudflare:workers";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const row=await env.DB!.prepare("SELECT data FROM covers WHERE id=?").bind((await params).id).first<{data:string}>();
 if(!row)return new Response(null,{status:404});
 return new Response(Uint8Array.from(atob(row.data),c=>c.charCodeAt(0)),{headers:{"Content-Type":"image/jpeg","Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"}});
}
