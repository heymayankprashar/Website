const events=await (await fetch("./events.json")).json();
const el=id=>document.getElementById(id);
const money=value=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:2,minimumFractionDigits:0}).format(value);
const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const date=e=>new Date(e.startDate).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",timeZone:"Europe/London"});
let category="All events",selected=events[0],side="buy",photo="",draft={};
function tabs(box,items,current,choose){
 box.replaceChildren(...items.map(item=>{const button=document.createElement("button");button.type="button";button.textContent=item;button.setAttribute("aria-pressed",String(item===current));button.onclick=()=>choose(item);return button}));
}
function renderBoard(){
 tabs(el("filters"),["All events",...new Set(events.map(e=>e.category))],category,c=>{category=c;renderBoard()});
 const query=el("search").value.toLowerCase().trim();
 const rows=events.filter(e=>(category==="All events"||e.category===category)&&(e.name+" "+e.venue).toLowerCase().includes(query));
 el("cards").innerHTML=rows.map(e=>'<a class="card" href="#event/'+e.id+'"><img class="art" src="'+escape(e.image)+'" alt=""><div class="body"><small>'+escape(e.category)+'</small><h2>'+escape(e.name)+'</h2><p>'+date(e)+' · '+escape(e.venue)+'</p><div class="quote">'+(e===events[0]?"Lowest ask £20 · Last sold £18":"Place the first bid ↗")+'</div></div></a>').join("")||"<p>No events match your search.</p>";
}
function choices(){
 const q=el("lookup").value.trim().toLowerCase();
 const rows=events.filter(e=>e.name.toLowerCase().includes(q)||q.includes(e.id.replace("pf-","").toLowerCase())||q.includes(btoa("clubs:Event:"+e.id).toLowerCase()));
 el("choices").innerHTML=rows.map(e=>'<a class="choice" href="#event/'+e.id+'/sell">'+escape(e.name)+' ↗</a>').join("")||"<p>Try a preview event name or its organizer link.</p>";
}
function market(){
 const t=selected.tiers[el("tier").selectedIndex]??selected.tiers[0];
 const active=selected===events[0]&&t.name==="Regular";
 return {face:t.price.amount,ask:active?20:null,bid:active?18:null,last:active?18:null};
}
function pricePanel(reset=true){
 const m=market(),buy=side==="buy",target=buy?m.ask:m.bid;
 el("prices").innerHTML=[["Lowest ask",m.ask],["Highest bid",m.bid],["Last sold",m.last],["Face value",m.face]].map(([label,value])=>'<div><small>'+label+'</small><b>'+(value==null?"—":money(value))+'</b></div>').join("");
 tabs(el("sides"),["Buy","Sell"],buy?"Buy":"Sell",s=>{side=s.toLowerCase();el("result").textContent="";pricePanel()});
 if(reset)el("amount").value=target??m.face;
 const price=Number(el("amount").value);
 const match=target!=null&&(buy?price>=target:price<=target);
 el("hint").textContent=match?"This price matches an existing "+(buy?"seller.":"buyer."):(target==null?"You can post the first "+(buy?"bid.":"ask."):"Your "+(buy?"bid":"ask")+" will stay open at "+money(price)+".");
 el("submitOrder").textContent=match?"Match "+money(target):(buy?"Place bid":"List ticket")+" at "+money(price);
 return match;
}
function inviteCard(d){
 const title=escape(d.name||"Your house party");
 const time=d.when?new Intl.DateTimeFormat("en-GB",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"UTC"}).format(new Date(d.when+"Z"))+" London time":"Date to be announced";
 return '<article class="inv">'+(photo?'<img alt="Party cover" src="'+escape(photo)+'">':'<div class="partyArt">'+title+'</div>')+'<div class="invBody"><small>House party</small><h2>'+title+'</h2><p>'+escape(time)+' · '+escape(d.venue||"Neighbourhood")+'</p><p>'+escape(d.plan)+'</p><div class="quote">'+escape(d.qty||1)+' tickets · '+(Number(d.price)?money(d.price):"Free entry")+'</div></div></article>';
}
function preview(){draft=Object.fromEntries(new FormData(el("editor")));el("invitation").innerHTML=inviteCard(draft)}
function route(){
 let [view,id,mode]=location.hash.slice(1).split("/");
 if(!["sell","event","host","invite"].includes(view))view="board";
 if(view==="event"){selected=events.find(e=>e.id===id)??events[0];side=mode==="sell"?"sell":"buy";el("eventName").textContent=selected.name;el("kind").textContent=selected.category;el("where").textContent=date(selected)+" · "+selected.venue+(selected.id.startsWith("pf-")?" · Host lists both 24 and 25 Nov; confirm the date.":"");el("eventPoster").innerHTML='<img src="'+escape(selected.image)+'" alt="Organizer poster">';el("tier").innerHTML=selected.tiers.map(t=>'<option>'+escape(t.name)+'</option>').join("");el("tier").selectedIndex=selected===events[0]?1:0;el("result").textContent="";pricePanel()}
 if(view==="invite"){try{const d=JSON.parse(decodeURIComponent(id));if(!d.name||!Number.isFinite(Date.parse(d.when+"Z")))throw Error();el("finished").innerHTML=inviteCard(d)}catch{view="host"}}
 for(const section of document.querySelectorAll("main>section"))section.hidden=section.id!==view;
 if(view==="board")renderBoard();if(view==="sell")choices();if(view==="host")preview();
 window.scrollTo(0,0);
}
el("search").oninput=renderBoard;el("lookup").oninput=choices;el("amount").oninput=()=>pricePanel(false);el("tier").onchange=()=>{el("result").textContent="";pricePanel()};
el("order").onsubmit=e=>{e.preventDefault();el("result").textContent=pricePanel(false)?"Preview match confirmed.":"Your preview order is open."};
el("editor").oninput=preview;el("cover").onchange=e=>{if(photo)URL.revokeObjectURL(photo);photo=e.target.files[0]?URL.createObjectURL(e.target.files[0]):"";preview()};
document.querySelector(".previewBtn").onclick=()=>el("invitation").scrollIntoView({block:"center"});
el("editor").onsubmit=e=>{e.preventDefault();preview();el("copied").textContent="";location.hash="invite/"+encodeURIComponent(JSON.stringify(draft))};
el("copy").onclick=async()=>{try{await navigator.clipboard.writeText(location.href);el("copied").textContent="Preview link copied."+ (photo?" Uploaded artwork is visible on this device.":"")}catch{el("copied").textContent="Copy the preview link from your address bar."}};
window.addEventListener("hashchange",route);route();
