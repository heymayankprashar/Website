import {env} from "cloudflare:workers";
import {digest,student,cookieName} from "./student-access";
const adjectives=["Disco","Chaotic","Velvet","Sneaky","Dapper","Cosmic","Feral","Sleepy"];
const nouns=["Spreadsheet","DiscoPigeon","Turnip","Croissant","NightOwl","Samosa","Bagel","Badger"];
function username(){
 const random=crypto.getRandomValues(new Uint32Array(2));
 return adjectives[random[0]%adjectives.length]+nouns[random[1]%nouns.length]+crypto.randomUUID().slice(0,5);
}
async function passwordHash(password:string,salt:string){
 const encoder=new TextEncoder();
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:encoder.encode(salt),iterations:100000,hash:"SHA-256"},key,256);
 return Array.from(new Uint8Array(bits),n=>n.toString(16).padStart(2,"0")).join("");
}
const error=(message:string,status:number)=>Response.json({error:message},{status});
export async function account(action:"join"|"login",email:string,password:string){
 const db=env.DB!;
 let row=await db.prepare("SELECT principal,salt,passwordHash FROM accounts WHERE email=?").bind(email).first<{principal:string,salt:string,passwordHash:string}>();
 if(action==="join"){
  if(row)return error("An account already uses that address. Choose Sign in.",409);
  const existing=await db.prepare("SELECT EXISTS(SELECT 1 FROM sessions WHERE email=?) OR EXISTS(SELECT 1 FROM listings WHERE owner=?) OR EXISTS(SELECT 1 FROM deals WHERE buyer=? OR seller=?) AS present").bind(email,email,email,email).first<number>("present");
  const prior=await student();
  if(existing && prior!==email)return error("This address has an earlier account. Use your existing sign-in link once to set a password.",409);
  const principal=prior===email?email:crypto.randomUUID(),salt=crypto.randomUUID();
  const hash=await passwordHash(password,salt);
  const inserted=await db.prepare("INSERT INTO accounts(email,principal,username,salt,passwordHash) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING").bind(email,principal,username(),salt,hash).run();
  if(!inserted.meta.changes)return error("Couldn’t create this account. Try signing in or retry.",409);
  row={principal,salt,passwordHash:hash};
 }else{
  const hash=await passwordHash(password,row?.salt??"plot-twist-login");
  if(!row || hash!==row.passwordHash)return error("Check your email and password.",401);
 }
 const token=crypto.randomUUID()+crypto.randomUUID(),age=30*86400;
 await db.prepare("INSERT INTO sessions(digest,email,expires) VALUES(?,?,?)").bind(await digest(token),row.principal,Date.now()+age*1000).run();
 return Response.json({ok:true},{headers:{"Cache-Control":"no-store","Set-Cookie":cookieName+"="+token+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+age}});
}
