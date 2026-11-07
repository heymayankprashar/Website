export type EventInfo={id:string,name:string,startDate:string,description?:string|null,image?:string|null,venue?:string|null,tiers:{name:string,price:{amount:number,currency:string}|null}[]};
const tiers=(pairs:[string,number][])=>pairs.map(([name,amount])=>({name,price:{amount,currency:"GBP"}}));
export const initialEvents:EventInfo[]=[
 {id:"44213",image:"https://clubs.london.edu/upload/clubs/2026/image_upload_159884_Blue_Orange_and_Yellow_Retro_Music_Album_Cover_2jpg_c0c010d3-6538-44d0-8a14-703365c78856_115165754.jpeg",name:"Afro Party",startDate:"2026-11-18T22:00:00Z",venue:"The Lucky Pig Cocktail Bar",tiers:tiers([["Early Bird",15],["Regular",25]])},
 {id:"44121",image:"https://clubs.london.edu/upload/clubs/2026/image_upload_158525_WhatsApp_Image_20261027_at_101926_5200f21c-464b-4cfb-b2ec-a4725f08799a_102821310.jpeg",name:"American Thanksgiving: North America Club",startDate:"2026-11-16T19:00:00Z",venue:"Sussex Place, Park Restaurant Suite 1",tiers:tiers([["Early Bird",35],["Regular Ticket",40]])},
 {id:"pf-C825B7GCrs25QDCdpgxg",name:"🏮 LBS Chinese Dinner 🥢",startDate:"2026-11-24T20:00:00Z",venue:"Imperial China, Chinatown",image:"https://partiful-posters.imgix.net/dumpling-party?fit=max&w=1000&h=1000",tiers:tiers([["Dinner",45]])}
];

export const source=(id:string)=>id.startsWith("hp-")?"/events/"+id:id.startsWith("pf-")?"https://partiful.com/e/"+id.slice(3):"https://e.cglink.me/2ka/r"+id;

export function eventCategory(name:string,id=""){
 if(id.startsWith("hp-"))return "House parties";
 if(/conference|summit|forum|symposium/i.test(name))return "Conferences";
 if(/party|club night|ball\b|nightlife|disco/i.test(name))return "Parties";
 if(/dinner|thanksgiving|brunch|lunch|supper|tasting/i.test(name))return "Food & drink";
 if(/workshop|lecture|seminar|panel|masterclass/i.test(name))return "Talks & workshops";
 if(/football|tennis|sport|run club|tournament/i.test(name))return "Sports";
 return "Other events";
}
export function stillOnBoard(event:EventInfo){
 const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"});
 const end=event.id==="44213"?"2026-11-19T03:00:00Z":event.startDate;
 return date.format(new Date(end))>=date.format(new Date());
}
