import {env} from "cloudflare:workers";
import {cookies} from "next/headers";
export const adminEmail="mayankprashar.02@gmail.com";
export const cookieName="tc_student";
export async function digest(value:string){
 const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function student(){
 const token=(await cookies()).get(cookieName)?.value;
 if(!token)return null;
 return env.DB!.prepare("SELECT email FROM sessions WHERE digest=? AND expires>?").bind(await digest(token),Date.now()).first<string>("email");
}
