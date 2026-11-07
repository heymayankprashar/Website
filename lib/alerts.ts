import {env} from "cloudflare:workers";
const encode=(bytes:Uint8Array)=>btoa(Array.from(bytes,c=>String.fromCharCode(c)).join("")).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
const part=(data:object)=>encode(new TextEncoder().encode(JSON.stringify(data)));
export function pushOrigin(endpoint:string){
 try{const u=new URL(endpoint);return u.protocol==="https:"&&!u.port&&!u.username&&!u.password&&["fcm.googleapis.com","updates.push.services.mozilla.com","web.push.apple.com","notify.windows.com"].some(host=>u.hostname===host||u.hostname.endsWith("."+host))?u.origin:null}catch{return null}
}
export async function keys(){
 const db=env.DB!,read=()=>db.prepare("SELECT secret,publicKey FROM pushKeys WHERE id='vapid'").first<{secret:string,publicKey:string}>();
 let pair=await read();
 if(!pair){
  const keys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]) as CryptoKeyPair;
  await db.prepare("INSERT OR IGNORE INTO pushKeys VALUES('vapid',?,?)").bind(JSON.stringify(await crypto.subtle.exportKey("jwk",keys.privateKey)),encode(new Uint8Array(await crypto.subtle.exportKey("raw",keys.publicKey)))).run();
  pair=await read();
 }
 return pair!;
}
export async function alertUsers(owners:string[],body:string,path:string){
 const db=env.DB!;
 await Promise.all([...new Set(owners)].map(async owner=>{
  await db.prepare("INSERT INTO alerts VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),owner,body,path,Date.now()).run();
  const devices=await db.prepare("SELECT endpoint FROM pushDevices WHERE owner=?").bind(owner).all<{endpoint:string}>();
  if(!devices.results.length)return;
  const pair=await keys(),key=await crypto.subtle.importKey("jwk",JSON.parse(pair.secret),{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  await Promise.allSettled(devices.results.map(async({endpoint})=>{
   const origin=pushOrigin(endpoint);if(!origin)return;
   const token=part({alg:"ES256",typ:"JWT"})+"."+part({aud:origin,exp:Math.floor(Date.now()/1000)+3600,sub:"mailto:mayankprashar.02@gmail.com"});
   const signature=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,new TextEncoder().encode(token));
   const r=await fetch(endpoint,{method:"POST",redirect:"manual",headers:{TTL:"3600",Authorization:"vapid t="+token+"."+encode(new Uint8Array(signature))+", k="+pair.publicKey}});
   if(r.status===410||r.status===404)await db.prepare("DELETE FROM pushDevices WHERE endpoint=? AND owner=?").bind(endpoint,owner).run();
  }));
 })).catch(()=>console.warn("Alert delivery incomplete"));
}
export async function tradeAlert(id:string,actor:string,message:string,both=false){
 const row=await env.DB!.prepare("SELECT buyer,seller,event FROM deals JOIN listings ON listings.id=deals.listing WHERE deals.id=?").bind(id).first<{buyer:string,seller:string,event:string}>();
 if(row)await alertUsers([row.buyer,row.seller].filter(p=>both||p!==actor),row.event+" · "+message,"/?view=trades");
}
