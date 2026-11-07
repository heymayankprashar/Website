"use client";
import {useState} from "react";
export type ChatMessage={id:string,deal:string,body:string,mine:number};
export function Conversation({deal,messages,refresh}:{deal?:string,messages?:ChatMessage[],refresh?:()=>Promise<void>}){
 const [draft,setDraft]=useState(""),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setStatus("");
  try{
   const r=await fetch("/api/market",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:deal?"message":"feedback",id:deal,issue:draft.trim()})});
   if(!r.ok)throw Error("Couldn’t send. Please try again.");
   setDraft("");setStatus(deal?"Sent.":"Thanks for the suggestion.");await refresh?.();
  }catch(e){setStatus((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="community"><h3>{deal?"Private trade chat":"Suggestions for Plot Twist"}</h3>
 {messages?.map(m=><p key={m.id}><b>{m.mine?"You":"Trading partner"}</b>{" "}{m.body.split(/(https:\/\/[^\s]+)/g).map((part,i)=>part.startsWith("https://")?<a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>:part)}</p>)}
 <form onSubmit={submit}><label>{deal?"Message or payment link":"What could work better? Any feature you’d like?"}<textarea required maxLength={1000} value={draft} onChange={e=>setDraft(e.target.value)}/></label><button disabled={busy||!draft.trim()}>{deal?"Send message":"Send feedback"}</button></form><small role="status">{status}</small></section>
}
