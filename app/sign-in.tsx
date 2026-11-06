"use client";
import {useState} from "react";
import {mbaAddress} from "../lib/eligibility";
export function SignIn({done}:{done:()=>Promise<void>}){
 const [mode,setMode]=useState<"join"|"login">("join"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");
  const form=new FormData(e.currentTarget),email=String(form.get("email")).trim().toLowerCase();
  if(!mbaAddress.test(email)){setError("Use your @london.edu address with MBA before the @.");return}
  setBusy(true);
  try{
   const r=await fetch("/api/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:mode,email,password:form.get("password")})});
   if(!r.ok){const body=await r.json() as {error:string};throw Error(body.error)}
   await done();
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <><div className="filters">{(["join","login"] as const).map(key=><button key={key} className={key===mode?"selected":""} onClick={()=>{setMode(key);setError("")}}>{key==="join"?"Create account":"Sign in"}</button>)}</div>
 <h2>{mode==="join"?"Pick up an alias":"Welcome back"}</h2><p>{mode==="join"?"We’ll give you a unique username for bids and the leaderboard. Your email stays private.":"Sign in to see your bids and handovers."}</p>
 <form onSubmit={submit}><label>Private MBA email<input type="email" name="email" autoComplete="username" required placeholder="alex.mba27@london.edu"/></label><label>Password<input type="password" name="password" minLength={8} maxLength={128} required autoComplete={mode==="join"?"new-password":"current-password"} placeholder="At least 8 characters"/></label><button className="primary" disabled={busy}>{busy?"One moment…":mode==="join"?"Create my account":"Sign in"}</button></form>{error&&<p role="alert">{error}</p>}</>
}
