"use client";
import {useState} from "react";
export default function Approvals(){
 const [email,E]=useState(""),[code,C]=useState(""),[error,S]=useState(""),[busy,B]=useState(false);
 return <article><p>Enter the student’s LBS address. Send the sign-in link directly to that mailbox. Links expire after 15 minutes and work once.</p><form onSubmit={async e=>{e.preventDefault();B(true);C("");S("");try{const r=await fetch("/api/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"issue",email})});const j=await r.json() as {error?:string,link?:string};if(!r.ok)throw Error(j.error);C(j.link!)}catch(e){S((e as Error).message)}finally{B(false)}}}><input type="email" required value={email} onChange={e=>{E(e.target.value);C("")}} aria-label="LBS email" placeholder="Student’s @london.edu email"/><button disabled={busy}>Generate sign-in link</button></form>{code&&<><p>{code}</p><a href={"mailto:"+encodeURIComponent(email)+"?subject=Your%20Plot%20Twist%20sign-in&body="+encodeURIComponent("Sign in to Plot Twist: "+code+" (expires in 15 minutes).")}>Email link to {email} ↗</a></>}{error&&<p role="alert">{error}</p>}</article>
}
