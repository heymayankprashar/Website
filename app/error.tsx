"use client";
export default function PageError(){
 return <main><h1>Page couldn’t load</h1><button className="primary" onClick={()=>window.location.reload()}>Reload page</button> <a href="/">Return to ticket exchange</a></main>
}
