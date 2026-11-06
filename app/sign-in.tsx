"use client";
import {useState} from "react";
import {mbaAddress} from "../lib/eligibility";
export function SignIn(){
 const [email,setEmail]=useState(""),[status,setStatus]=useState(""),[error,setError]=useState("");
 async function request(e:React.FormEvent){
  e.preventDefault();setError("");
  const address=email.trim().toLowerCase();
  if(!mbaAddress.test(address)){setError("Use an @london.edu address with MBA before the @.");return}
  setStatus("sending");
  try{
   const r=await fetch("/api/access",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"request",email:address})});
   const data=await r.json() as {error?:string,manual?:boolean};
   if(!r.ok)throw Error(data.error);
   setStatus(data.manual?"manual":"sent");
  }catch(e){setStatus("");setError((e as Error).message)}
 }
 return <><h2>Student sign-in</h2>{status==="sent"?<p>Check {email} for your single-use sign-in link.</p>:status==="manual"?<><p>Automatic delivery is awaiting setup. Send a request from {email} and the reviewer will reply with a sign-in link.</p><a className="primary" href={"mailto:mayankprashar.02@gmail.com?subject=Plot%20Twist%20sign-in&body="+encodeURIComponent("Please send a Plot Twist sign-in link to my MBA inbox: "+email+". Reviewer page: "+location.origin+"/approve")}>Email the reviewer ↗</a></>:<form onSubmit={request}><label>MBA email address<input type="email" required autoComplete="email" placeholder="alex.mba27@london.edu" value={email} onChange={e=>setEmail(e.target.value)}/></label><p>Open the link in your LBS inbox to sign in.</p><button className="primary" disabled={status==="sending"}>Request sign-in link ↗</button></form>}{error&&<p role="alert">{error}</p>}</>
}
