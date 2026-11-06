"use client";
import {useState} from "react";
type Point={price:number,finished:number};
export const pounds=(n:number)=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:n%100?2:0}).format(n/100);
const stamp=(t:number)=>new Date(t).toLocaleString("en-GB",{timeZone:"Europe/London",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
export function PriceChart({sales,sample}:{sales:Point[],sample:boolean}){
 const [index,setIndex]=useState<number|null>(null);
 const points=[...sales].sort((a,b)=>a.finished-b.finished);
 if(!points.length)return <section className="chart"><h3>Price history</h3><p>The first confirmed sale will appear here.</p></section>;
 const first=points[0],last=points[points.length-1],prices=points.map(p=>p.price);
 const lo=Math.max(0,Math.min(...prices)-100),hi=Math.max(...prices)+100;
 const x=(p:Point)=>first.finished===last.finished?220:45+345*(p.finished-first.finished)/(last.finished-first.finished);
 const y=(p:number)=>110-95*(p-lo)/(hi-lo);
 const selected=points[index??points.length-1]??last;
 return <section className="chart"><div className="charthead"><h3>Price history</h3><small>{sample?"ILLUSTRATIVE DATA":"CONFIRMED SALES"}</small></div><svg viewBox="0 0 410 130" role="group" aria-label="Sale prices over time">{[lo,(lo+hi)/2,hi].map(p=><g key={p}><line x1="42" x2="396" y1={y(p)} y2={y(p)} stroke="#ddd9d3" strokeDasharray="3 4"/><text x="0" y={y(p)+4} fontSize="10">{pounds(Math.round(p))}</text></g>)}<polyline points={points.map(p=>x(p)+","+y(p.price)).join(" ")} fill="none" stroke="#6644ba" strokeWidth="2"/>{points.map((p,i)=><g key={i} role="button" tabIndex={0} aria-label={stamp(p.finished)+" "+pounds(p.price)} onFocus={()=>setIndex(i)} onClick={()=>setIndex(i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setIndex(i)}}><circle cx={x(p)} cy={y(p.price)} r="10" fill="transparent"/><circle cx={x(p)} cy={y(p.price)} r={p===selected?5:3.5} fill="#6340aa"/></g>)}</svg><div className="chartaxis"><small>{stamp(first.finished)}</small><small>{stamp(last.finished)}</small></div><p aria-live="polite">{pounds(selected.price)} · {stamp(selected.finished)} London time</p></section>
}
