"use client";
export default function PageError(){
 return <main><h1>Page couldn’t load</h1><button className="primary" onClick={()=>window.location.reload()}>Reload page</button></main>
}
