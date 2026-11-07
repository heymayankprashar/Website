"use client";
import {useState,useEffect} from "react";
export function AlertSettings(){
 const [notice,S]=useState(""),[on,O]=useState(false),[rows,R]=useState<{body:string,path:string}[]>([]);
 useEffect(()=>{fetch("/api/alerts").then(r=>r.json()).then((d:any)=>R(d.alerts)).catch(()=>{});navigator.serviceWorker?.getRegistration().then(r=>r?.pushManager?.getSubscription()).then(sub=>O(!!sub)).catch(()=>{})},[]);
 async function toggle(){
 try{
  if(!("serviceWorker" in navigator)||!("PushManager" in window))throw Error("This browser doesn’t support background alerts.");
  if(!on&&await Notification.requestPermission()!=="granted")throw Error("Allow notifications in browser settings to receive background alerts.");
  await navigator.serviceWorker.register("/alerts-sw.js");const reg=await navigator.serviceWorker.ready;
  const {key}=await (await fetch("/api/alerts")).json() as {key:string};
  const previous=await reg.pushManager.getSubscription();
  const sub=previous??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(atob(key.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0))});
  const r=await fetch("/api/alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint,remove:on})});
  if(!r.ok)throw Error("Couldn’t save your alert settings.");
  if(on)await sub.unsubscribe();O(!on);S(on?"Background alerts off.":"Background alerts on.");
 }catch(e){S((e as Error).message)}
 }
 return <section><h3>Activity alerts</h3><button onClick={toggle}>{on?"Turn off device alerts":"Enable device alerts"}</button><p role="status">{notice}</p>{rows.map((r,i)=><p key={i}><a href={r.path}>{r.body}</a></p>)}</section>
}
