/* Remove the server-rendered Halloween theme at 00:01 Denver. */
(function(){
 const script=document.currentScript;
 const servedAt=Number(new URL(script.src).searchParams.get("at"));
 const began=performance.now(),end=1793512860000;
 function expire(){if(servedAt+performance.now()-began<end)return;document.getElementById("gah-halloween")?.remove();document.getElementById("gah-halloween-style")?.remove();document.documentElement.classList.remove("gah-halloween");clearInterval(timer);}
 const timer=setInterval(expire,1000);
 setTimeout(expire,Math.max(0,end-servedAt));
 document.addEventListener("visibilitychange",expire);window.addEventListener("pageshow",expire);
})();
