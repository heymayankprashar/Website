"use client";
import {useEffect,useState} from "react";
import "./hosting.css";
import {SignIn} from "../sign-in";
async function cover(file:File){
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 canvas.getContext("2d")!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 return canvas.toDataURL("image/jpeg",.68);
}
export default function Host(){
 const [member,M]=useState<boolean|null>(null),[error,E]=useState(""),[busy,B]=useState(false),[image,I]=useState(""),[key]=useState(()=>crypto.randomUUID());
 useEffect(()=>{fetch("/api/market").then(r=>r.json()).then((d:any)=>M(!!d.member)).catch(()=>E("Refresh to check your account."))},[]);
 async function publish(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);B(true);E("");
  try{const r=await fetch("/api/party",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,name:f.get("name"),description:f.get("description"),venue:f.get("venue"),start:new Date(String(f.get("start"))).getTime(),price:Math.round(Number(f.get("price"))*100),quantity:Number(f.get("quantity")),image})});
  if(!r.ok)throw Error("Couldn’t publish. Check the details and sign-in, then try again.");const d=await r.json() as {id:string};location.assign("/events/"+d.id)
  }catch(e){E((e as Error).message);B(false)}
 }
 return <main className="hostPage"><div className="hostingNav"><strong>Plot Twist</strong><a href="/"><span aria-hidden="true">←</span> Ticket exchange</a></div><div className="hostingBanner"><h1>Host a <em>house party.</em></h1></div>{member===false?<section className="hostAccount"><SignIn hosting done={async()=>M(true)}/></section>:member?<form className="hostForm" onSubmit={publish}><fieldset><legend>Party details</legend><label>Party name<input name="name" placeholder="Kitchen Disco" maxLength={90} required/></label><label>What’s the plan?<textarea name="description" maxLength={1500} required/></label><label>Neighbourhood<input name="venue" placeholder="e.g. Marylebone" maxLength={120} required/></label><small>Share the exact address privately with your guests.</small><label>Starts ({Intl.DateTimeFormat().resolvedOptions().timeZone})<input type="datetime-local" name="start" required/></label></fieldset><fieldset><legend>Tickets</legend><div className="ticketFields"><label>Tickets available<input type="number" name="quantity" defaultValue="1" min="1" max="50" required/></label><label>Price per ticket (£)<input type="number" name="price" defaultValue="0" min="0" max="10000" step=".01" required/></label></div></fieldset><fieldset><legend>Artwork</legend><label>Cover photo (optional)<input type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];I("");if(!file)return;B(true);try{const data=await cover(file);if(data.length>500000)throw Error();I(data);E("")}catch{E("Choose a smaller JPEG or PNG photo.")}finally{B(false)}}}/></label>{image&&<img src={image} alt="Party cover preview"/>}</fieldset><button className="primary" disabled={busy}>Publish party &amp; tickets</button></form>:<p>Checking your account…</p>}<p role="status">{error}</p></main>
}
