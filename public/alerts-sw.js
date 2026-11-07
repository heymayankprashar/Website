self.addEventListener("push",event=>{
 event.waitUntil((async()=>{
  let alert;
  try{const response=await fetch("/api/alerts",{credentials:"include",cache:"no-store"});alert=(await response.json()).alerts[0]}catch{}
  await self.registration.showNotification("Plot Twist",{body:alert?.body||"Open Plot Twist to check your activity.",data:alert?.path||"/?view=trades",tag:"plot-twist-activity"});
 })());
});
self.addEventListener("notificationclick",event=>{event.notification.close();event.waitUntil(clients.openWindow(event.notification.data))});
