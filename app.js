(function(){
var C=window.MUIF_CONFIG,$=function(s){return document.querySelector(s)};
var KEY="muif_rsvp_v1",data={name:"",email:"",phone:"",batch:""},step=0,N=5;

/* header */
var meta=$("#meta");
[C.dateText,C.timeText,C.venue].forEach(function(t){if(t){var li=document.createElement("li");li.textContent=t;meta.appendChild(li)}});

/* seats */
function loadSeats(){
  if(!(C.seatCap>0)||!C.scriptUrl)return;
  fetch(C.scriptUrl+"?action=count").then(function(r){return r.json()}).then(function(j){
    if(j&&typeof j.seatsLeft==="number"){$("#seats").hidden=false;$("#seatNum").textContent=j.seatsLeft}
  }).catch(function(){});
}
loadSeats();

/* form steps */
var steps=[].slice.call(document.querySelectorAll(".step"));
function show(i){
  step=i;steps.forEach(function(s,k){s.classList.toggle("active",k===i)});
  [].forEach.call(document.querySelectorAll("#segs i"),function(x,k){x.classList.toggle("on",k<=i)});$("#kbd").style.visibility=i===N-1?"hidden":"";
  $("#back").hidden=i===0;
  $("#next").style.display=i===N-1?"none":"";
  $("#err").textContent="";
  var inp=steps[i].querySelector("input");if(inp)setTimeout(function(){inp.focus()},60);
}
function err(m){$("#err").textContent=m;return false}
function valid(i){
  if(i===0){data.name=$("#name").value.trim();if(data.name.length<2)return err("Tell us your name.")}
  if(i===1){data.email=$("#email").value.trim().toLowerCase();
    if(!/^[^\s@]+@mastersunion\.org$/.test(data.email))return err("Use your @mastersunion.org email.")}
  if(i===2){var d=$("#phone").value.replace(/\D/g,"");if(d.length===12&&d.indexOf("91")===0)d=d.slice(2);
    if(d.length!==10)return err("Enter a 10 digit phone number.");data.phone=d}
  if(i===3){if(!data.batch)return err("Pick your batch.")}
  return true;
}
$("#next").onclick=function(){if(valid(step))show(step+1)};
$("#back").onclick=function(){show(step-1)};
$("#form").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();if(step<N-1)$("#next").click()}});
$("#batch").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
  [].forEach.call(this.children,function(c){c.classList.remove("on")});b.classList.add("on");data.batch=b.dataset.v;$("#err").textContent=""});

/* hold to enter */
var holdT=null,start=0,HOLD=1000,busy=false;
var hold=$("#hold"),fill=hold.querySelector(".fill"),lab=hold.querySelector("em");
function tick(){var p=Math.min(1,(Date.now()-start)/HOLD);fill.style.width=(p*100)+"%";
  if(p>=1){stopHold();submit()}else holdT=requestAnimationFrame(tick)}
function startHold(e){if(busy)return;e.preventDefault();start=Date.now();lab.textContent="Keep holding";holdT=requestAnimationFrame(tick)}
function stopHold(){cancelAnimationFrame(holdT);if(!busy){fill.style.width="0";lab.textContent="Hold to enter"}}
hold.addEventListener("pointerdown",startHold);
["pointerup","pointerleave","pointercancel"].forEach(function(ev){hold.addEventListener(ev,stopHold)});
hold.addEventListener("keydown",function(e){if((e.key===" "||e.key==="Enter")&&!e.repeat){startHold(e)}});
hold.addEventListener("keyup",stopHold);

/* submit */
function submit(){
  for(var i=0;i<4;i++)if(!valid(i)){show(i);return}
  busy=true;lab.textContent="Locking in...";fill.style.width="100%";
  var tok="";try{var sv=JSON.parse(localStorage.getItem(KEY)||"null");if(sv&&sv.email===data.email&&sv.token)tok=sv.token}catch(e){}
  var payload={action:"rsvp",name:data.name,email:data.email,phone:data.phone,batch:data.batch,token:tok};
  send(payload,0).then(function(res){
    busy=false;
    if(res&&res.ok===false){show(4);fill.style.width="0";lab.textContent="Hold to enter";return err(res.error||"Something went wrong. Try again.")}
    var rec={name:data.name,email:data.email,phone:data.phone,batch:data.batch,id:(res&&res.ticketId)||localId(data.email),waitlist:!!(res&&res.waitlist),token:(res&&res.token)||""};
    try{localStorage.setItem(KEY,JSON.stringify(rec))}catch(e){}
    showTicket(rec);
  }).catch(function(){busy=false;fill.style.width="0";lab.textContent="Hold to enter";err("Network is busy. Hold again to retry.")});
}
function send(p,n){
  if(!C.scriptUrl)return Promise.resolve({ok:true}); // preview mode: nothing is saved
  return fetch(C.scriptUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(p)})
    .then(function(r){if(r.status===429||r.status>=500)throw new Error("retry");return r.json()})
    .catch(function(e){if(n<3)return new Promise(function(ok){setTimeout(ok,800*(n+1))}).then(function(){return send(p,n+1)});throw e});
}
function localId(e){var h=0;for(var i=0;i<e.length;i++)h=(h*31+e.charCodeAt(i))>>>0;return "MUIF-"+h.toString(36).toUpperCase().padStart(6,"0").slice(0,6)}

/* ticket */
function showTicket(r){
  $("#formCard").hidden=true;$("#ticket").hidden=false;
  $("#tName").textContent=r.name;$("#tEvent").textContent=C.eventName;$("#tId").textContent=r.id;
  $("#tDate").textContent=C.dateText;$("#tTime").textContent=C.timeText;
  if(C.venue){$("#tVenue").textContent=C.venue}else{$("#tVenueRow").hidden=true}
  $("#tNote").textContent=r.waitlist?"You are on the waitlist. We will email you if a seat opens.":"Show this ticket at the door. Same email again updates your RSVP.";
  bars(r.id);burst();window.scrollTo({top:0,behavior:"smooth"});
}
$("#edit").onclick=function(){
  try{var r=JSON.parse(localStorage.getItem(KEY)||"{}");$("#name").value=r.name||"";$("#email").value=r.email||"";$("#phone").value=r.phone||"";
    data.batch=r.batch||"";[].forEach.call($("#batch").children,function(c){c.classList.toggle("on",c.dataset.v===data.batch)})}catch(e){}
  $("#ticket").hidden=true;$("#formCard").hidden=false;fill.style.width="0";lab.textContent="Hold to enter";show(0);
};
$("#cal").onclick=function(){
  var s=new Date(C.startISO),e=new Date(s.getTime()+4*3600e3);
  var f=function(d){return d.toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"")};
  var ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//MUIF//RSVP//EN","BEGIN:VEVENT","UID:"+Date.now()+"@muif","DTSTAMP:"+f(new Date()),
   "DTSTART:"+f(s),"DTEND:"+f(e),"SUMMARY:"+C.eventName,C.venue?"LOCATION:"+C.venue:"","END:VEVENT","END:VCALENDAR"].filter(Boolean).join("\r\n");
  var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar"}));a.download="muif-orientation.ics";a.click();
};
$("#share").onclick=function(){
  var t=C.eventName+" - "+C.dateText+", "+C.timeText,u=location.href;
  if(navigator.share)navigator.share({title:C.eventName,text:t,url:u}).catch(function(){});
  else if(navigator.clipboard){navigator.clipboard.writeText(t+" "+u);$("#share").textContent="Link copied"}
};

function bars(id){var b=$("#bars");b.innerHTML="";var h=0;for(var i=0;i<id.length;i++)h=(h*131+id.charCodeAt(i))>>>0;
 for(var k=0;k<14;k++){h=(h*1103515245+12345)>>>0;var w=1+(h>>>16)%4;var e=document.createElement("i");e.style.width=w+"px";b.appendChild(e)}}
/* background: hanging vines + confetti */
var cv=$("#fx"),cx=cv.getContext("2d"),pv=$("#pop"),px=pv.getContext("2d"),W,H,D=Math.min(devicePixelRatio||1,2),B=[],V=[],reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
function size(){W=cv.width=pv.width=innerWidth*D;H=cv.height=pv.height=innerHeight*D;
 V=[];var n=Math.max(6,Math.round(innerWidth/110));
 for(var i=0;i<n;i++)V.push({x:(i+.5)/n*W+(Math.random()-.5)*60*D,len:(.25+Math.random()*.6)*H,A:(10+Math.random()*16)*D,ph:Math.random()*6.28,sp:.0004+Math.random()*.0004,up:i%3===2})}
addEventListener("resize",size);size();
var cols=["#7be0a0","#eac91f","#ffe9cc","#1f8a55","#e8573f"];
function burst(){for(var i=0;i<90;i++)B.push({x:W/2,y:H*.35,vx:(Math.random()-.5)*16*D,vy:(-Math.random()*14-3)*D,l:1,c:cols[i%5],r:Math.random()*6,s:(5+Math.random()*7)*D})}
function leaf(x,y,a,s,col){cx.save();cx.translate(x,y);cx.rotate(a);cx.fillStyle=col;cx.beginPath();cx.moveTo(0,0);cx.quadraticCurveTo(s*.6,-s*.5,s*1.6,0);cx.quadraticCurveTo(s*.6,s*.5,0,0);cx.fill();cx.restore()}
function draw(t){
  cx.clearRect(0,0,W,H);
  V.forEach(function(v){
    var dir=v.up?-1:1,y0=v.up?H:0;
    cx.strokeStyle="rgba(123,224,160,.55)";cx.lineWidth=2*D;cx.beginPath();
    var pts=[];
    for(var s=0;s<=v.len;s+=14*D){var x=v.x+Math.sin(s/(90*D)+t*v.sp*2+v.ph)*v.A*(s/v.len+.3);var y=y0+dir*s;pts.push([x,y]);s?cx.lineTo(x,y):cx.moveTo(x,y)}
    cx.stroke();
    for(var k=3;k<pts.length;k+=3){var p=pts[k],side=(k/3)%2?1:-1;
      leaf(p[0],p[1],(side>0?-.5:Math.PI+.5)+Math.sin(t*.001+k)*.12,(13+(k%4)*3)*D,k%6===0?"rgba(234,201,31,.35)":"rgba(31,138,85,.55)")}
  });
  px.clearRect(0,0,W,H);
  B.forEach(function(b){b.x+=b.vx;b.y+=b.vy;b.vy+=.5*D;b.vx*=.99;b.r+=.2;b.l-=.012;px.save();px.globalAlpha=Math.max(b.l,0);px.translate(b.x,b.y);px.rotate(b.r);px.fillStyle=b.c;px.fillRect(-b.s/2,-b.s/4,b.s,b.s/2);px.restore()});
  B=B.filter(function(b){return b.l>0});
  if(!reduce||B.length)requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

/* returning visitor */
try{var saved=JSON.parse(localStorage.getItem(KEY)||"null");if(saved&&saved.email)showTicket(saved)}catch(e){}
show(0);
})();
