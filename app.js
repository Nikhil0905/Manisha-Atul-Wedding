(function(){
  document.documentElement.className+=' js';
  function $(i){return document.getElementById(i)}
  var rh=$('r-hi'),re=$('r-en');
  function isHi(){return !(re&&re.checked)}
  try{var sv=localStorage.getItem('wd-lang'); if(sv==='en'&&re){re.checked=true}}catch(e){}
  function onLang(){try{localStorage.setItem('wd-lang',isHi()?'hi':'en')}catch(e){} document.documentElement.lang=isHi()?'hi':'en'; tick()}
  try{rh.addEventListener('change',onLang);re.addEventListener('change',onLang);rh.addEventListener('click',onLang);re.addEventListener('click',onLang)}catch(e){}

  // wedding: 16 Nov 2026, Barat 8 PM IST = 14:30 UTC
  var target=Date.UTC(2026,10,16,14,30,0);
  var ids=[$('c-d'),$('c-h'),$('c-m'),$('c-s')], note=$('c-note');
  function p(n){return n<10?'0'+n:''+n}
  function tick(){
    try{
    var d=target-new Date().getTime(), hi=isHi();
    if(d<=0){for(var i=0;i<4;i++){ids[i].textContent='00'} note.textContent=hi?'शुभ विवाह का समय आ गया है।':'The celebration has begun.';return}
    var s=Math.floor(d/1000);
    ids[0].textContent=Math.floor(s/86400); ids[1].textContent=p(Math.floor(s%86400/3600)); ids[2].textContent=p(Math.floor(s%3600/60)); ids[3].textContent=p(s%60);
    note.textContent=hi?'अमृतसर में आपका स्वागत है।':'We look forward to welcoming you in Amritsar.';
    }catch(e){}
  }
  tick(); setInterval(tick,1000);

})();

/* =====================================================================
   INTERACTIVE FEATURES & SUPABASE INTEGRATION
   Backend: Supabase (PostgreSQL with Row Level Security & Realtime)
   - RSVP: Stored privately in Supabase (max 3 records per phone number)
   - Pushp Varsha: Atomic shared counter with realtime updates
   - Song Jukebox: Public song requests with upvoting & realtime ranking
   - Floating Diyas: Public lake drift with realtime broadcast
   - Guestbook / Wishes: Stored in Supabase for the host; local preview for guests
   - Host Panel: Protected by host authentication; displays live database records & CSV export
   ===================================================================== */
(function(){
  'use strict';

  /* ---- CONFIG ---- */
  var WA_GROUP_URL='https://chat.whatsapp.com/HcYo4IcvSz9E0eE0SPuYUY?s=cl&p=a&mlu=4&ilr=4&iam=2';
  var HOST_WA='919855582403';
  var VENUE='Freedom Grand, G T Road, Opposite Nexus Mall, Amritsar';

  var SB_URL='https://ccztjqrooksobsujfrgb.supabase.co';
  var SB_KEY='sb_publishable_MeNhfOye2Xc6HakRYOOm8Q_EBXrgppe';

  /* shared between the wishes wall and the host panel */
  var WALL={get:function(){return[]},live:false,onChange:null};

  /* Shared Supabase Client Loader */
  var SBX=(function(){
    var client=null, state='idle', waiters=[];
    function initClient(){
      if(window.supabase && SB_URL && SB_KEY){
        try{
          client=window.supabase.createClient(SB_URL, SB_KEY);
          state='ready';
          return client;
        }catch(e){
          state='failed';
          if(window.console)console.error('Supabase init error:', e);
        }
      }
      return null;
    }
    function loadScript(src, ok, no){
      var s=document.createElement('script');
      s.src=src;
      s.async=true;
      s.onload=ok;
      s.onerror=no;
      document.head.appendChild(s);
    }
    function get(callback, onFail){
      if(client){callback(client);return}
      if(state==='failed'){if(onFail)onFail();return}
      if(window.supabase){
        var c=initClient();
        if(c){callback(c);return}
      }
      waiters.push({ok:callback, no:onFail});
      if(state==='idle'){
        state='loading';
        loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js', function(){
          var c=initClient();
          var w=waiters; waiters=[];
          if(c){
            for(var i=0;i<w.length;i++){try{w[i].ok(c)}catch(e){}}
          }else{
            for(var j=0;j<w.length;j++){try{if(w[j].no)w[j].no()}catch(e){}}
          }
        }, function(){
          state='failed';
          var w=waiters; waiters=[];
          for(var j=0;j<w.length;j++){try{if(w[j].no)w[j].no()}catch(e){}}
        });
      }
    }
    return {
      enabled: !!(SB_URL && SB_KEY),
      use: get
    };
  })();

  /* ---- helpers ---- */
  var DOC=document, D=DOC.documentElement;
  function $(i){return DOC.getElementById(i)}
  function q(s,r){return (r||DOC).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||DOC).querySelectorAll(s))}
  function isHi(){var e=$('r-en');return !(e&&e.checked)}
  function el(t,c,x){var n=DOC.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
  function bi(hi,en,tag){var w=el(tag||'span');w.appendChild(el('span','hi',hi));w.appendChild(el('span','en',en));return w}
  function rnd(a,b){return a+Math.random()*(b-a)}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function clean(s,n){return String(s==null?'':s).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n)}
  function lsGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}}
  function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  var reduce=false;try{reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){}
  function smoothTo(node,block){try{node.scrollIntoView({behavior:reduce?'auto':'smooth',block:block||'start'})}catch(e){node.scrollIntoView()}}

  /* ---- toast ---- */
  var toastEl=$('toast'),toastT;
  function toast(hi,en){
    if(!toastEl)return;
    toastEl.textContent='';toastEl.appendChild(el('span','hi',hi));toastEl.appendChild(el('span','en',en));
    toastEl.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastEl.classList.remove('on')},2800);
  }

  /* ---- copy ---- */
  function copyText(t,done){
    function fb(){
      try{var a=el('textarea');a.value=t;a.setAttribute('readonly','');a.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';DOC.body.appendChild(a);a.select();a.setSelectionRange(0,t.length);var ok=DOC.execCommand('copy');DOC.body.removeChild(a);done(ok)}catch(e){done(false)}
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){done(true)},fb)}else fb();
  }

  /* ---- personalised guest (?guest=Name) ---- */
  var GUEST='';
  try{var gm=/[?&]guest=([^&#]*)/.exec(location.search);if(gm){GUEST=clean(decodeURIComponent(gm[1].replace(/\+/g,' ')).replace(/[<>]/g,''),60)}}catch(e){}
  function myName(){return GUEST||lsGet('wd-name','')}
  function setMyName(n){if(n&&!GUEST)lsSet('wd-name',n)}
  if(GUEST){
    var gl=$('guest-line');
    if(gl){qa('.gname',gl).forEach(function(b){b.textContent=GUEST});gl.hidden=false}
  }
  function prefillNames(){qa('[data-name]').forEach(function(i){if(!i.value)i.value=myName()})}

  /* ---- language-dependent attributes (placeholders, <option> text) ---- */
  function applyLang(){
    var hi=isHi();D.lang=hi?'hi':'en';
    qa('[data-ph-hi]').forEach(function(n){n.placeholder=n.getAttribute(hi?'data-ph-hi':'data-ph-en')});
    qa('[data-t-hi]').forEach(function(n){n.textContent=n.getAttribute(hi?'data-t-hi':'data-t-en')});
  }
  ['r-hi','r-en'].forEach(function(id){var n=$(id);if(n){n.addEventListener('change',applyLang);n.addEventListener('click',applyLang)}});

  /* ---- particle engine (confetti + petals) ---- */
  function makeFx(cv,full){
    var cx=cv.getContext('2d'),parts=[],raf=0,last=0,W=0,H=0,dpr=Math.min(window.devicePixelRatio||1,2);
    function fit(){
      if(full){W=window.innerWidth;H=window.innerHeight}else{var p=cv.parentNode;W=p.clientWidth;H=p.clientHeight}
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';cx.setTransform(dpr,0,0,dpr,0,0);
    }
    function draw(p){
      cx.save();cx.globalAlpha=Math.max(0,Math.min(1,p.life/.7));cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillStyle=p.c;
      if(p.k==='p'){cx.scale(1,.55);cx.beginPath();cx.arc(0,0,p.w,0,6.2832);cx.fill()}
      else if(p.k==='c'){cx.beginPath();cx.arc(0,0,p.w/2,0,6.2832);cx.fill()}
      else cx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      cx.restore();
    }
    function step(t){
      if(!last)last=t;var dt=Math.min(.05,(t-last)/1000);last=t;cx.clearRect(0,0,W,H);
      for(var i=parts.length-1;i>=0;i--){
        var p=parts[i];p.life-=dt;p.t+=dt;
        if(p.life<=0||p.y>H+40){parts.splice(i,1);continue}
        p.vy+=p.g*dt;
        if(p.drag){var k=Math.max(0,1-p.drag*dt);p.vx*=k;p.vy*=k}
        p.x+=(p.vx+(p.sw?Math.sin(p.t*2.2+p.ph)*p.sw:0))*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;draw(p);
      }
      if(parts.length){raf=requestAnimationFrame(step)}else{raf=0;last=0;cx.clearRect(0,0,W,H)}
    }
    return{
      dims:function(){if(!raf)fit();return{w:W,h:H}},
      add:function(a){for(var i=0;i<a.length;i++)parts.push(a[i]);if(!raf){last=0;raf=requestAnimationFrame(step)}}
    };
  }
  function P(o){o.t=0;o.ph=o.ph||0;o.sw=o.sw||0;o.drag=o.drag||0;o.h=o.h||o.w;return o}

  var fxCv=$('fx'),fx=fxCv&&fxCv.getContext?makeFx(fxCv,true):null;
  function confetti(x,y){
    if(!fx)return;
    var d=fx.dims(),cols=['#e63946','#f4a261','#e9c46a','#2a9d8f','#ff7fa5','#7d1022','#f1d3bd','#8ecae6'],a=[],i,n=reduce?36:120;
    for(i=0;i<n;i++){var ang=rnd(0,6.2832),sp=rnd(160,560);
      a.push(P({k:Math.random()<.3?'c':'r',x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp-180,g:620,drag:1.1,r:rnd(0,6),vr:rnd(-9,9),w:rnd(6,11),h:rnd(4,8),c:cols[i%cols.length],life:rnd(1.8,3)}));}
    if(!reduce){for(var s=0;s<2;s++){for(i=0;i<46;i++){
      var an=s?rnd(-2.35,-1.8):rnd(-1.35,-.8),v=rnd(520,980);
      a.push(P({k:'r',x:s?d.w-8:8,y:d.h-8,vx:Math.cos(an)*v,vy:Math.sin(an)*v,g:820,drag:.9,r:rnd(0,6),vr:rnd(-10,10),w:rnd(5,10),h:rnd(3,9),c:cols[(i+s)%cols.length],life:rnd(2,3.2)}))}}}
    fx.add(a);
  }

  /* ---- Pushp Varsha (petal shower counter in Supabase) ---- */
  (function(){
    var btn=$('pushp-btn'),cv=$('pcv');if(!btn||!cv||!cv.getContext)return;
    var f=makeFx(cv,false),n=lsGet('wd-pushp',0),sb=null,total=0,pend=0,timer=0;
    function paint(){var v=sb?total+pend:n;qa('.pv-n').forEach(function(e){e.textContent=v})}
    function flush(){
      timer=0;if(!sb||!pend)return;
      var d=Math.min(pend,50);pend-=d;
      sb.rpc('increment_pushp', {delta: d}).then(function(res){
        if(res.error){pend+=d;paint()}
      });
      if(pend)timer=setTimeout(flush,1200);
    }
    paint();
    if(SBX.enabled){
      SBX.use(function(client){
        sb=client;
        sb.from('pushp_counter').select('count').eq('id', 1).single().then(function(res){
          if(res.data && res.data.count!=null){
            total=+res.data.count;
            paint();
          }
        });
        try{
          sb.channel('public:pushp_counter')
            .on('postgres_changes', {event:'UPDATE', schema:'public', table:'pushp_counter'}, function(payload){
              if(payload.new && payload.new.count!=null){
                total=+payload.new.count;
                paint();
              }
            })
            .subscribe();
        }catch(e){}
        if(pend&&!timer)timer=setTimeout(flush,300);
      });
    }
    btn.addEventListener('click',function(){
      n++;lsSet('wd-pushp',n);pend++;paint();
      if(sb&&!timer)timer=setTimeout(flush,1200);
      var d=f.dims(),cols=['#e8728f','#f4a261','#f6c453','#ffffff','#d94f70','#f08a5d'],a=[],c=reduce?8:38;
      for(var i=0;i<c;i++)a.push(P({k:'p',x:rnd(0,d.w),y:rnd(-d.h*.45,-10),vx:rnd(-20,20),vy:rnd(70,150),g:6,r:rnd(0,6),vr:rnd(-2.5,2.5),w:rnd(5,9),c:cols[i%cols.length],life:14,ph:rnd(0,6),sw:rnd(18,46)}));
      f.add(a);
    });
  })();

  /* ---- RSVP wizard (with Supabase persistence & max 3 limit per phone) ---- */
  (function(){
    var form=$('rv-form');if(!form)return;
    var panels=[1,2,3,4].map(function(i){return $('rv-p'+i)}),dots=qa('#wz-steps li'),back=$('rv-back'),next=$('rv-next'),err=$('rv-err');
    var step=1,S=lsGet('wd-rsvp-me',null)||{};
    var SLOT={morning:['प्रातः','Morning'],afternoon:['दोपहर','Afternoon'],evening:['सायं','Evening'],night:['रात्रि','Night']};
    var MODE={train:['🚆 रेल','🚆 Train'],flight:['✈️ विमान','✈️ Flight'],car:['🚗 कार','🚗 Car'],bus:['🚌 बस','🚌 Bus']};
    function val(id){var e=$(id);return e?e.value:''}
    function radio(n){var r=q('input[name="'+n+'"]:checked',form);return r?r.value:''}
    function setRadio(n,v){qa('input[name="'+n+'"]',form).forEach(function(r){r.checked=(r.value===v)})}
    function setDays(a){qa('input[name="rv-day"]',form).forEach(function(c){c.checked=a.indexOf(+c.value)>-1})}
    function days(){return qa('input[name="rv-day"]:checked',form).map(function(c){return +c.value})}
    function digits(){var d=String(S.phone||'').replace(/\D/g,'');if(d.length===12&&d.indexOf('91')===0)d=d.slice(2);if(d.length===11&&d.charAt(0)==='0')d=d.slice(1);return d}
    function count(){if(S.cnt==='15+'){var x=parseInt(S.cntx,10);return x>15?x:16}return parseInt(S.cnt,10)||1}
    function fmtTime(t){if(!t)return '';var a=t.split(':'),h=+a[0],m=a[1],ap=h>=12?'PM':'AM';h=h%12||12;return h+':'+m+' '+ap}
    function slotOf(t){var h=parseInt(t,10);return h>=5&&h<12?'morning':h>=12&&h<16?'afternoon':h>=16&&h<20?'evening':'night'}

    function collect(){
      S.name=clean(val('rv-name'),60);S.phone=clean(val('rv-phone'),20);S.att=radio('rv-att');
      S.cnt=val('rv-count')||'1';S.cntx=val('rv-countx');S.days=days();
      S.arr=val('rv-arr');S.slot=radio('rv-slot');S.time=val('rv-time');S.mode=radio('rv-mode');
      lsSet('wd-rsvp-me',S);
    }
    function fill(){
      $('rv-name').value=S.name||myName();$('rv-phone').value=S.phone||'';setRadio('rv-att',S.att||'');
      $('rv-count').value=S.cnt||'1';$('rv-countx').value=S.cntx||'';$('rv-countx-w').hidden=($('rv-count').value!=='15+');
      setDays(S.days||[]);$('rv-arr').value=S.arr||'';setRadio('rv-slot',S.slot||'');$('rv-time').value=S.time||'';setRadio('rv-mode',S.mode||'');
    }
    function showErr(m){err.textContent='';if(m){err.appendChild(el('span','hi',m[0]));err.appendChild(el('span','en',m[1]))}}
    function validate(n){
      if(n===1){
        if(!S.name)return['कृपया अपना नाम लिखें','Please enter your name'];
        var d=digits();if(d.length!==10)return['कृपया 10 अंकों का सही मोबाइल नंबर लिखें','Please enter a valid 10-digit phone number'];
        if(!S.att)return['कृपया चुनें कि आप पधारेंगे या नहीं','Please choose Attending or Not Attending'];
      }
      if(n===2){
        if(S.cnt==='15+'){var x=parseInt(S.cntx,10);if(!(x>15&&x<=300))return['कृपया कुल संख्या लिखें (16 या अधिक)','Please enter the exact number (16 or more)']}
        if(!S.days.length)return['कृपया कम से कम एक दिन चुनें','Please choose at least one day'];
      }
      if(n===3){
        if(!S.arr)return['कृपया आगमन की तिथि चुनें','Please select your arrival date'];
        if(!S.slot)return['कृपया आगमन का समय-खंड चुनें','Please choose an arrival time slot'];
        if(!S.mode)return['कृपया यात्रा का साधन चुनें','Please choose your mode of travel'];
      }
      return null;
    }
    function record(){
      var d=digits();if(!d)return;var all=lsGet('wd-rsvps',{});
      all[d]={name:S.name,att:S.att,cnt:S.att==='yes'?count():0,days:S.att==='yes'?(S.days||[]):[],joined:!!S.joined,grp:S.joined?(S.grp||0):0,ts:Date.now()};
      lsSet('wd-rsvps',all);
    }
    function show(n,noScroll){
      step=n;
      panels.forEach(function(p,i){p.classList.toggle('on',i===n-1)});
      dots.forEach(function(d,i){d.classList.toggle('on',i===n-1);d.classList.toggle('done',i<n-1)});
      back.hidden=(n===1);next.hidden=(n===4);next.classList.toggle('last',n===3);
      showErr(null);
      if(!noScroll){var r=form.getBoundingClientRect();if(r.top<0||r.top>window.innerHeight*.5)smoothTo(form,'start')}
    }

    /* step 4 */
    function waText(){
      var d=(S.days||[]).join(', ');
      return ['*RSVP - Manisha weds Atul*','Name: '+S.name,'Phone: '+S.phone,'Attending: Yes','Members: '+count(),'Days: '+d+' Nov',
        'Arrival: '+S.arr+' Nov, '+(SLOT[S.slot]?SLOT[S.slot][1]:'')+(S.time?' ('+fmtTime(S.time)+')':'')+', '+(MODE[S.mode]?MODE[S.mode][1].replace(/^\S+\s/,''):''),
        'Joining WhatsApp group: '+(S.joined?S.grp:'not yet')+(GUEST?'\nInvite link name: '+GUEST:'')].join('\n');
    }
    function groupHref(){return WA_GROUP_URL}
    function refreshLinks(){$('rv-grp-btn').href=groupHref();$('rv-send').href='https://wa.me/'+HOST_WA+'?text='+encodeURIComponent(waText())}
    function sumLine(ul,lhi,len,vhi,ven){var li=el('li');li.appendChild(bi(lhi,len));li.appendChild(bi(vhi,ven));ul.appendChild(li)}
    function buildStep4(){
      var n=count(),g=$('rv-grp-n'),ul=$('rv-sum');
      g.max=n;g.min=1;S.grp=Math.max(1,Math.min(S.grp||1,n));g.value=S.grp;
      ul.textContent='';
      var dd=(S.days||[]).join(', ');
      sumLine(ul,'नाम','Name',S.name,S.name);
      sumLine(ul,'सदस्य','Members',String(n),String(n));
      sumLine(ul,'दिन','Days',dd+' नवंबर',dd+' Nov');
      var sl=SLOT[S.slot]||['',''],tm=S.time?' · '+fmtTime(S.time):'',md=MODE[S.mode]||['',''];
      sumLine(ul,'आगमन','Arrival',S.arr+' नवंबर · '+sl[0]+tm+' · '+md[0],S.arr+' Nov · '+sl[1]+tm+' · '+md[1]);
      refreshLinks();
    }
    function persist(){lsSet('wd-rsvp-me',S)}

    function saveRsvpToSupabase(onDone){
      var payload={
        name: S.name,
        phone: digits(),
        attending: S.att,
        member_count: S.att==='yes'?count():0,
        member_count_exact: S.cnt==='15+'?(parseInt(S.cntx,10)||null):null,
        days: S.att==='yes'?(S.days||[]):null,
        arrival_date: S.att==='yes'&&S.arr?parseInt(S.arr,10):null,
        arrival_slot: S.att==='yes'?S.slot:null,
        arrival_time: S.att==='yes'?(S.time||null):null,
        travel_mode: S.att==='yes'?S.mode:null,
        wa_group_joined: !!S.joined,
        wa_group_count: S.joined?(S.grp||0):0
      };

      if(!SBX.enabled){
        onDone(null);
        return;
      }

      SBX.use(function(client){
        client.from('rsvps').insert(payload).then(function(res){
          if(res.error){
            if(res.error.code==='P0001' || (res.error.message && res.error.message.indexOf('maximum allowed')>-1)){
              onDone(['इस मोबाइल नंबर से अधिकतम 3 RSVP पहले ही दर्ज हैं।', 'This mobile number already has 3 RSVP records (maximum allowed).']);
            }else{
              onDone(['RSVP सहेजने में समस्या आई — कृपया पुनः प्रयास करें।', 'Could not save RSVP — please try again.']);
            }
          }else{
            onDone(null);
          }
        });
      }, function(){
        onDone(null);
      });
    }

    next.addEventListener('click',function(){
      collect();var e=validate(step);if(e){showErr(e);return}showErr(null);
      if(step===1){
        setMyName(S.name);prefillNames();
        if(S.att==='no'){
          next.disabled=true;
          saveRsvpToSupabase(function(err){
            next.disabled=false;
            if(err){showErr(err);return}
            S.done=true;S.joined=false;persist();record();
            toast('धन्यवाद! कृपया अपना आशीर्वाद लिखें 🙏','Thank you! Please leave your wishes 🙏');
            var w=$('wishes');if(w){smoothTo(w,'start');setTimeout(function(){var m=$('wh-msg');if(m)try{m.focus({preventScroll:true})}catch(x){}},700)}
          });
          return;
        }
        show(2);return;
      }
      if(step===2){show(3);return}
      if(step===3){
        next.disabled=true;
        saveRsvpToSupabase(function(err){
          next.disabled=false;
          if(err){showErr(err);return}
          S.done=true;S.grp=S.grp||1;persist();record();buildStep4();show(4);
          confetti(window.innerWidth/2, window.innerHeight/2);
          toast('आपकी उपस्थिति दर्ज हो गई 🎉','RSVP saved 🎉');
        });
      }
    });
    back.addEventListener('click',function(){if(step>1)show(step-1)});
    $('rv-count').addEventListener('change',function(){$('rv-countx-w').hidden=(this.value!=='15+')});
    $('rv-alldays').addEventListener('click',function(){setDays([12,13,15,16])});
    $('rv-time').addEventListener('change',function(){if(this.value&&!radio('rv-slot'))setRadio('rv-slot',slotOf(this.value))});
    form.addEventListener('submit',function(e){e.preventDefault()});

    var gn=$('rv-grp-n');
    function setGrp(v){var n=count();v=parseInt(v,10)||1;v=Math.max(1,Math.min(v,n));S.grp=v;gn.value=v;if(S.joined)record();persist();refreshLinks()}
    $('rv-gm').addEventListener('click',function(){setGrp((parseInt(gn.value,10)||1)-1)});
    $('rv-gp').addEventListener('click',function(){setGrp((parseInt(gn.value,10)||1)+1)});
    gn.addEventListener('change',function(){setGrp(gn.value)});
    $('rv-grp-btn').addEventListener('click',function(){S.joined=true;S.grp=Math.max(1,parseInt(gn.value,10)||1);record();persist();refreshLinks()});
    $('rv-send').addEventListener('click',function(){refreshLinks()});

    /* VIP welcome pass (PNG) */
    function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
    function spaced(x,t,cx0,y,sp){var w=0,i,ws=[];for(i=0;i<t.length;i++){ws[i]=x.measureText(t.charAt(i)).width;w+=ws[i]}w+=sp*(t.length-1);var px=cx0-w/2,al=x.textAlign;x.textAlign='left';for(i=0;i<t.length;i++){x.fillText(t.charAt(i),px,y);px+=ws[i]+sp}x.textAlign=al}
    function fitText(x,t,font,size,maxW){var s=size;do{x.font=font.replace('%s',s);if(x.measureText(t).width<=maxW||s<=22)break;s-=2}while(true)}
    function code(){var s=S.name+digits(),h=7,i;for(i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return'MA-'+('00000'+h.toString(36).toUpperCase()).slice(-5)}
    function drawPass(){
      var W=900,H=1280,c=el('canvas');c.width=W;c.height=H;var x=c.getContext('2d');
      var SERIF="'Cormorant Garamond','Tiro Devanagari Hindi',Georgia,serif",DEVA="'Tiro Devanagari Hindi','Cormorant Garamond',Georgia,serif",SANS="Mukta,'Segoe UI',Arial,sans-serif";
      var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#fdf4ea');g.addColorStop(1,'#f1d3bd');x.fillStyle=g;x.fillRect(0,0,W,H);
      x.strokeStyle='#c9a05a';x.lineWidth=6;rr(x,30,30,W-60,H-60,36);x.stroke();x.lineWidth=2;rr(x,52,52,W-104,H-104,26);x.stroke();
      x.textAlign='center';x.textBaseline='alphabetic';
      x.fillStyle='#8a5a0c';x.font='700 30px '+DEVA;x.fillText('॥ श्री गणेशाय नमः ॥',W/2,130);
      x.fillStyle='#7d1022';x.font='700 27px '+SANS;spaced(x,'VIP WELCOME PASS',W/2,200,7);
      x.fillStyle='#7d1022';fitText(x,'Manisha weds Atul','italic 500 %spx '+SERIF,104,760);x.fillText('Manisha weds Atul',W/2,330);
      x.font='500 54px '+DEVA;x.fillText('मनीषा संग अतुल',W/2,408);
      x.strokeStyle='#c9a05a';x.lineWidth=2;x.beginPath();x.moveTo(200,470);x.lineTo(W/2-18,470);x.moveTo(W/2+18,470);x.lineTo(W-200,470);x.stroke();
      x.fillStyle='#8a5a0c';x.save();x.translate(W/2,470);x.rotate(Math.PI/4);x.fillRect(-7,-7,14,14);x.restore();
      x.fillStyle='#8a5a0c';x.font='600 28px '+SANS;spaced(x,'WELCOME',W/2,545,6);
      x.fillStyle='#7d1022';fitText(x,S.name,'italic 500 %spx '+SERIF,92,740);x.fillText(S.name,W/2,640);
      x.fillStyle='#4b1620';x.font='600 34px '+SANS;x.fillText('Party of '+count(),W/2,705);
      var rows=[['CEREMONIES',(S.days||[]).join('  ·  ')+'  Nov'],['ARRIVAL',S.arr+' Nov  ·  '+(SLOT[S.slot]?SLOT[S.slot][1]:'')+(S.time?'  ·  '+fmtTime(S.time):'')+'  ·  '+(MODE[S.mode]?MODE[S.mode][1].replace(/^\S+\s/,''):'')],['VENUE','Freedom Grand, Amritsar']];
      var y=800;
      rows.forEach(function(r){x.fillStyle='#8a5a0c';x.font='700 22px '+SANS;spaced(x,r[0],W/2,y,5);x.fillStyle='#4b1620';fitText(x,r[1],'600 %spx '+SANS,34,740);x.fillText(r[1],W/2,y+46);y+=116});
      x.fillStyle='#7d1022';rr(x,150,1096,W-300,82,41);x.fill();
      x.fillStyle='#fdf4ea';x.font='700 32px '+SANS;x.fillText('16 November 2026',W/2,1148);
      x.fillStyle='#8a5a0c';x.font='600 22px '+SANS;spaced(x,'PASS  '+code(),W/2,1206,4);
      return c;
    }
    function loadFonts(cb){
      var fin=false;function go(){if(!fin){fin=true;cb()}}setTimeout(go,1800);
      try{if(DOC.fonts&&DOC.fonts.load){Promise.all([DOC.fonts.load('italic 500 40px "Cormorant Garamond"','Manisha'),DOC.fonts.load('400 30px "Tiro Devanagari Hindi"','मनीषा संग अतुल ॥ श्री गणेशाय नमः'),DOC.fonts.load('600 30px Mukta','VIP')]).then(go,go)}else go()}catch(e){go()}
    }
    $('rv-pass-btn').addEventListener('click',function(){
      collect();
      loadFonts(function(){
        var c=drawPass(),img=$('rv-pass-img');
        try{img.src=c.toDataURL('image/png');$('rv-prev').hidden=false}catch(e){}
        function save(b){
          try{var url=URL.createObjectURL(b),a=el('a');a.href=url;a.download='VIP-Welcome-Pass-'+(S.name||'guest').replace(/[^\w\u0900-\u097F]+/g,'-').slice(0,30)+'.png';DOC.body.appendChild(a);a.click();DOC.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url)},4000)}catch(e){}
        }
        if(c.toBlob){c.toBlob(function(b){if(b)save(b)},'image/png')}
        toast('आपका VIP पास तैयार है','Your VIP pass is ready');
      });
    });

    /* init */
    fill();
    if(S.done&&S.att==='yes'&&!validate(1)&&!validate(2)&&!validate(3)){buildStep4();show(4,true)}else show(1,true);
  })();

  /* ---- wishes wall / guestbook: saved to Supabase; host-only retrieved archive ---- */
  (function(){
    var f=$('wh-form');if(!f)return;
    var BADGE={ash:['🙏','आशीर्वाद','Ashirwad'],shub:['🌸','शुभकामनाएँ','Best Wishes'],love:['❤️','स्नेह','With Love'],bad:['🎉','बधाई','Congratulations']};
    var PRE=[
      ['आपका साथ प्रेम, हँसी और अनंत खुशियों से भरा रहे। मनीषा और अतुल को हार्दिक बधाई!','May your journey together be filled with love, laughter and endless joy. Congratulations Manisha & Atul!'],
      ['आप दोनों को जीवन भर की खुशियाँ मिलें। ईश्वर का आशीर्वाद सदा आप पर बना रहे।','Wishing you a lifetime of happiness. God bless you both.'],
      ['सशरीर उपस्थित न हो पाने का खेद है, पर मेरा आशीर्वाद आप दोनों के साथ है।','Sorry I can’t be there in person, but my blessings are with you both.'],
      ['आपके साथ जश्न मनाने का इंतज़ार है! अमृतसर में मिलते हैं।','Can’t wait to celebrate with you! See you in Amritsar.']];
    var wishes=lsGet('wd-wishes',[]),mine=lsGet('wd-wlikes',{});
    var list=$('wh-list'),empty=$('wh-empty'),err=$('wh-err'),share=$('wh-share'),fLocal=$('wh-fine-local'),fLive=$('wh-fine-live');
    WALL.get=function(){return wishes};

    function setMode(live){
      WALL.live=live;
      if(fLocal)fLocal.hidden=live;
      if(fLive)fLive.hidden=!live;
    }
    function saveLocal(){lsSet('wd-wishes',wishes.slice(0,100));lsSet('wd-wlikes',mine)}

    function render(){
      list.textContent='';empty.hidden=wishes.length>0;
      wishes.forEach(function(w){
        var b=BADGE[w.b]||BADGE.ash,c=el('div','wcard'),h=el('div','wh'),who=el('div'),r=el('button','react');
        who.appendChild(el('div','wn',w.n));if(w.c)who.appendChild(el('div','wc',w.c));
        var bd=el('span','wb');bd.appendChild(el('span','',b[0]+' '));bd.appendChild(bi(b[1],b[2]));h.appendChild(who);h.appendChild(bd);
        c.appendChild(h);c.appendChild(el('p','wm',w.m));
        r.type='button';r.setAttribute('aria-pressed',mine[w.id]?'true':'false');
        r.appendChild(el('span','','❤️'));r.appendChild(bi('आशीर्वाद','Ashirwad'));r.appendChild(el('span','',String(w.l||0)));
        r.addEventListener('click',function(){like(w)});
        c.appendChild(r);list.appendChild(c);
      });
      if(WALL.onChange)WALL.onChange();
    }

    function like(w){
      var on=!mine[w.id];
      if(on)mine[w.id]=1;else delete mine[w.id];
      w.l=Math.max(0,(w.l||0)+(on?1:-1));
      saveLocal();render();
      if(SBX.enabled){
        SBX.use(function(client){
          if(w.id && w.id.indexOf('-')>-1){
            client.rpc('increment_likes',{wish_id:w.id, delta:on?1:-1});
          }
        });
      }
    }

    setMode(SBX.enabled);

    function setErr(m){err.textContent='';if(m){err.appendChild(el('span','hi',m[0]));err.appendChild(el('span','en',m[1]))}}
    qa('.pre',f).forEach(function(b){b.addEventListener('click',function(){var t=PRE[+b.getAttribute('data-i')];$('wh-msg').value=t[isHi()?0:1];setErr(null)})});

    f.addEventListener('submit',function(e){
      e.preventDefault();
      var n=clean($('wh-name').value,40),c=clean($('wh-city').value,40),m=clean($('wh-msg').value,240),bg=(q('input[name="wh-b"]:checked',f)||{}).value||'ash';
      if(!n)return setErr(['कृपया अपना नाम लिखें','Please enter your name']);
      if(!m)return setErr(['कृपया अपना संदेश लिखें','Please write a message']);
      var now=Date.now();
      if(now-lsGet('wd-wlast',0)<15000)return setErr(['कृपया कुछ क्षण बाद दोबारा भेजें','Please wait a few seconds before posting again']);
      setErr(null);setMyName(n);lsSet('wd-wlast',now);

      var localItem={id:uid(),n:n,c:c,m:m,b:bg,l:0,ts:now};
      wishes.unshift(localItem);saveLocal();render();

      if(SBX.enabled){
        SBX.use(function(client){
          client.from('wishes').insert({
            name: n,
            city: c || null,
            message: m,
            badge: bg,
            likes: 0
          }).then(function(res){
            if(res.error){
              toast('संदेश इस उपकरण पर सहेजा गया — पुनः प्रयास करें','Saved on device — try posting again to database');
            }else{
              toast('आपका आशीर्वाद परिवार तक पहुँच गया 🙏','Your blessing is saved for the family 🙏');
            }
          });
        });
      }

      $('wh-msg').value='';
      share.href='https://wa.me/'+HOST_WA+'?text='+encodeURIComponent('Blessing from '+n+(c?' ('+c+')':'')+':\n'+m);share.hidden=false;
      toast('आपका आशीर्वाद जुड़ गया 🙏','Your blessing is posted 🙏');
    });
    render();
  })();

  /* ---- family directory: search + filter ---- */
  (function(){
    var groups=qa('.fam .grp');if(!groups.length)return;
    var inp=$('fam-q'),none=$('fam-none'),chips=qa('.fchip'),cur='all';
    groups.forEach(function(g){
      qa('li',g).forEach(function(li){li.setAttribute('data-s',li.textContent.toLowerCase().replace(/\s+/g,' '))});
    });
    function apply(){
      var s=inp?inp.value.toLowerCase().replace(/\s+/g,' ').trim():'',any=false;
      groups.forEach(function(g,gi){
        var vis=0;
        qa('li',g).forEach(function(li){var ok=!s||li.getAttribute('data-s').indexOf(s)>-1;li.hidden=!ok;if(ok)vis++});
        g.hidden=!((cur==='all'||+cur===gi)&&vis>0);if(!g.hidden)any=true;
      });
      if(none)none.hidden=any;
    }
    if(inp)inp.addEventListener('input',apply);
    chips.forEach(function(ch){ch.addEventListener('click',function(){cur=ch.getAttribute('data-f');chips.forEach(function(o){o.setAttribute('aria-pressed',o===ch?'true':'false')});apply()})});
  })();

  /* ---- Sangeet jukebox (shared via Supabase with realtime rankings & votes) ---- */
  (function(){
    var f=$('sg-form');if(!f)return;
    var live=false,pending=SBX.enabled;
    var songs=lsGet('wd-songs',[]),mine=lsGet('wd-svotes',{}),list=$('sg-list'),empty=$('sg-empty'),err=$('sg-err'),fLocal=$('sg-fine-local'),fLive=$('sg-fine-live');
    function setMode(){if(fLocal)fLocal.hidden=live||pending;if(fLive)fLive.hidden=!live}
    function save(){if(!live)lsSet('wd-songs',songs.slice(0,60));lsSet('wd-svotes',mine)}
    function setErr(m){err.textContent='';if(m){err.appendChild(el('span','hi',m[0]));err.appendChild(el('span','en',m[1]))}}

    function vote(s){
      var on=!mine[s.id];
      if(on)mine[s.id]=1;else delete mine[s.id];
      s.v=Math.max(0,(s.v||0)+(on?1:-1));
      save();render();

      if(SBX.enabled && s.id && s.id.indexOf('-')>-1){
        SBX.use(function(client){
          client.rpc('vote_song',{song_id:s.id, delta:on?1:-1}).then(function(res){
            if(res.error){
              if(on)delete mine[s.id];else mine[s.id]=1;
              save();render();
            }
          });
        });
      }
    }

    function render(){
      songs.sort(function(a,b){return (b.v||0)-(a.v||0)||(a.ts||0)-(b.ts||0)});
      list.textContent='';empty.hidden=songs.length>0||pending;
      songs.forEach(function(s,i){
        var li=el('li','song'),inf=el('div','si'),r=el('button','react');
        li.appendChild(el('div','rk',String(i+1)));
        inf.appendChild(el('div','st',s.t));
        var meta=(s.a?s.a:'')+(s.a&&s.by?' · ':'')+(s.by?'🎤 '+s.by:'');if(meta)inf.appendChild(el('div','sa',meta));
        li.appendChild(inf);
        r.type='button';r.setAttribute('aria-pressed',mine[s.id]?'true':'false');r.appendChild(el('span','','🔥'));r.appendChild(el('span','',String(s.v||0)));r.setAttribute('aria-label','Upvote');
        r.addEventListener('click',function(){vote(s)});
        li.appendChild(r);list.appendChild(li);
      });
    }

    function loadSupabaseSongs(client){
      client.from('songs').select('*').order('votes',{ascending:false}).order('created_at',{ascending:true}).limit(100).then(function(res){
        pending=false;
        if(res.data && res.data.length>=0){
          live=true;
          songs=res.data.map(function(r){
            return {id:r.id, t:r.title, a:r.artist||'', by:r.requested_by||'', v:r.votes||0, ts:new Date(r.created_at).getTime()};
          });
          setMode();
          render();
        }else{
          live=false;
          setMode();
          render();
        }
      });
    }

    setMode();
    if(SBX.enabled){
      SBX.use(function(client){
        loadSupabaseSongs(client);
        try{
          client.channel('public:songs')
            .on('postgres_changes', {event:'*', schema:'public', table:'songs'}, function(){
              loadSupabaseSongs(client);
            })
            .subscribe();
        }catch(e){}
      }, function(){
        pending=false;live=false;setMode();render();
      });
    }

    f.addEventListener('submit',function(e){
      e.preventDefault();
      var t=clean($('sg-t').value,60),a=clean($('sg-a').value,40),n=clean($('sg-n').value,30);
      if(!t)return setErr(['कृपया गीत का नाम लिखें','Please enter a song title']);
      var key=(t+'|'+a).toLowerCase(),found=null;songs.forEach(function(s){if((s.t+'|'+s.a).toLowerCase()===key)found=s});
      var now=Date.now();
      if(!found&&now-lsGet('wd-slast',0)<10000)return setErr(['कृपया कुछ क्षण बाद दोबारा भेजें','Please wait a few seconds before adding another request']);
      setErr(null);setMyName(n);

      if(found){
        if(!mine[found.id])vote(found);
        toast('यह गीत पहले से सूची में है','That song is already on the list');
      }else if(SBX.enabled){
        lsSet('wd-slast',now);
        SBX.use(function(client){
          client.from('songs').insert({title:t, artist:a||null, requested_by:n||null, votes:1}).select().single().then(function(res){
            if(res.data){
              mine[res.data.id]=1;save();
              loadSupabaseSongs(client);
            }else{
              var s={id:uid(),t:t,a:a,by:n,v:1,ts:now};mine[s.id]=1;songs.push(s);save();render();
            }
          });
        });
        toast('फरमाइश जुड़ गई 🎵','Request added 🎵');
      }else{
        lsSet('wd-slast',now);
        var s={id:uid(),t:t,a:a,by:n,v:1,ts:now};mine[s.id]=1;songs.push(s);save();render();
        toast('फरमाइश जुड़ गई 🎵','Request added 🎵');
      }
      $('sg-t').value='';$('sg-a').value='';
    });
    render();
  })();

  /* ---- venue: copy address ---- */
  (function(){
    var b=$('copy-addr');if(!b)return;
    b.addEventListener('click',function(){copyText(VENUE,function(ok){ok?toast('पता कॉपी हो गया','Address copied'):toast('कॉपी नहीं हो सका','Couldn’t copy — please select it manually')})});
  })();

  /* ---- float a diya (broadcast live across all visitors via Supabase) ---- */
  (function(){
    var f=$('dy-form'),lake=$('lake');if(!f||!lake)return;
    var SVG='<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="17" r="14" fill="rgba(255,190,60,.30)"/><path class="fl2" d="M20 4Q27 13 20 22Q13 13 20 4Z" fill="#ffb524" stroke="#e07a10" stroke-width="1"/><path d="M5 24Q20 41 35 24Z" fill="#c0562b" stroke="#8a3a14" stroke-width="1.2"/><ellipse cx="20" cy="24" rx="15" ry="3" fill="#d9703a" stroke="#8a3a14" stroke-width="1"/></svg>';
    var sb=null;

    function launch(n,fresh){
      var d=el('div','dy'),dur=rnd(22,32);d.innerHTML=SVG;d.appendChild(el('span','',n));
      d.style.top=rnd(2,34)+'%';d.style.setProperty('--d',dur+'s');
      d.style.setProperty('--dl',(fresh?0:-rnd(0,dur))+'s');d.style.setProperty('--x',rnd(12,78)+'%');
      lake.appendChild(d);
      while(lake.children.length>10)lake.removeChild(lake.firstChild);
    }

    if(SBX.enabled){
      SBX.use(function(client){
        sb=client;
        sb.from('diyas').select('*').order('created_at',{ascending:false}).limit(10).then(function(res){
          if(res.data && res.data.length){
            res.data.reverse().forEach(function(r){
              launch(clean(r.name,24)||(isHi()?'अतिथि':'Guest'), false);
            });
          }
        });
        try{
          sb.channel('public:diyas')
            .on('postgres_changes', {event:'INSERT', schema:'public', table:'diyas'}, function(payload){
              if(payload.new){
                launch(clean(payload.new.name,24)||(isHi()?'अतिथि':'Guest'), true);
              }
            })
            .subscribe();
        }catch(e){}
      });
    }

    f.addEventListener('submit',function(e){
      e.preventDefault();
      var n=clean($('dy-name').value,24)||(isHi()?'अतिथि':'Guest');setMyName(n==='Guest'||n==='अतिथि'?'':n);
      var now=Date.now();
      if(now-lsGet('wd-dlast',0)<8000){toast('कृपया कुछ क्षण रुकें','Please wait a few seconds');return}
      lsSet('wd-dlast',now);

      launch(n,true);
      smoothTo(lake.parentNode,'center');
      toast('आपका दीप प्रवाहित हुआ 🪔','Your diya is floating 🪔');

      if(sb){
        sb.from('diyas').insert({name:n}).then(function(res){
          if(res.error && window.console)console.error('Diya broadcast error:', res.error);
        });
      }
    });
  })();

  /* ---- secured host panel (triple-tap the footer; protected by passcode) ---- */
  (function(){
    var foot=q('.foot'),box=$('admin');if(!foot||!box)return;
    var nameI=$('ad-name'),linkI=$('ad-link'),waA=$('ad-wa'),opener=null,taps=[];
    var authPasscode=sessionStorage.getItem('wd-ad-auth')||'';

    var loginDiv=$('ad-login'), bodyDiv=$('ad-body'), pwdI=$('ad-pwd'), unlockBtn=$('ad-unlock'), authErr=$('ad-err'), logoutBtn=$('ad-logout');

    function base(){return location.href.split(/[?#]/)[0]}
    function link(){var n=clean(nameI.value,60);return base()+(n?'?guest='+encodeURIComponent(n):'')}
    function upd(){var l=link();linkI.value=l;waA.href='https://wa.me/?text='+encodeURIComponent((nameI.value.trim()?'Dear '+clean(nameI.value,60)+',\n':'')+'You are warmly invited to the wedding of Manisha & Atul (16 Nov 2026, Amritsar).\nसादर आमंत्रण: '+l)}

    function renderStats(list){
      var y=0,m=0,g=0,ul=$('ad-list');ul.textContent='';
      list.forEach(function(r){
        if(r.attending==='yes'||r.att==='yes'){
          y++;
          m+=(r.member_count!=null?r.member_count:r.cnt)||0;
          g+=(r.wa_group_joined||r.joined)?(r.wa_group_count||r.grp||0):0;
        }
        var li=el('li');
        var nameSpan=el('span','',r.name + (r.phone ? ' ('+r.phone+')' : ''));
        li.appendChild(nameSpan);
        var isAtt = (r.attending==='yes'||r.att==='yes');
        var cntVal = (r.member_count!=null?r.member_count:r.cnt)||0;
        var grpVal = (r.wa_group_count!=null?r.wa_group_count:r.grp)||0;
        var st=isAtt?bi('✅ '+cntVal+' सदस्य'+(grpVal?' · समूह '+grpVal:''),'✅ '+cntVal+' member(s)'+(grpVal?' · group '+grpVal:'')):bi('🙏 नहीं आ पाएँगे','🙏 Not attending');
        li.appendChild(st);ul.appendChild(li);
      });
      $('st-n').textContent=list.length;$('st-y').textContent=y;$('st-m').textContent=m;$('st-g').textContent=g;
    }

    function loadHostData(){
      if(SBX.enabled && authPasscode){
        SBX.use(function(client){
          // Fetch live RSVPs securely via host_get_rsvps RPC
          client.rpc('host_get_rsvps', {passcode: authPasscode}).then(function(res){
            if(res.data && !res.error){
              renderStats(res.data);
            }
          });
          // Fetch live wishes securely via host_get_wishes RPC
          client.rpc('host_get_wishes', {passcode: authPasscode}).then(function(res){
            if(res.data && !res.error){
              var items=res.data.map(function(w){
                return {id:w.id, n:w.name, c:w.city||'', m:w.message, b:w.badge, l:w.likes||0, ts:new Date(w.created_at).getTime()};
              });
              renderWishes(items, true);
            }
          });
        });
      }else{
        // Local device fallback
        var all=lsGet('wd-rsvps',{}),ks=Object.keys(all),list=[];
        ks.forEach(function(k){list.push(all[k])});
        renderStats(list);
        renderWishes(WALL.get(), false);
      }
    }

    /* ---- guest wishes: list + CSV export ---- */
    var wl=$('ad-wishes'),wc=$('ad-wcount'),wLive=$('ad-wlive'),wLocal=$('ad-wlocal');
    var BN={ash:'Ashirwad',shub:'Best Wishes',love:'With Love',bad:'Congratulations'};
    var currentWishesList=[];

    function fmtWhen(ts){
      if(!ts)return '';
      try{return new Date(ts).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return ''}
    }
    function renderWishes(a, isLive){
      currentWishesList=a||[];
      wc.textContent=currentWishesList.length;wl.textContent='';
      if(wLive)wLive.hidden=!isLive;if(wLocal)wLocal.hidden=!!isLive;
      currentWishesList.forEach(function(w){
        var li=el('li'),h=el('div','awh');h.appendChild(el('b','',w.n));
        var meta=[w.c,fmtWhen(w.ts)].filter(Boolean).join(' · ');if(meta)h.appendChild(el('span','',meta));
        li.appendChild(h);li.appendChild(el('p','awm',w.m));wl.appendChild(li);
      });
    }

    function csvCell(s){s=String(s==null?'':s);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
    function csvText(){
      var rows=[['Time (IST)','Name','City / Relation','Badge','Message','Blessings']];
      currentWishesList.slice().reverse().forEach(function(w){
        var t='';try{t=w.ts?new Date(w.ts).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',hour12:false}):''}catch(e){}
        rows.push([t,w.n,w.c,BN[w.b]||w.b,w.m,w.l||0]);
      });
      return rows.map(function(r){return r.map(csvCell).join(',')}).join('\r\n');
    }
    function plainText(){
      return currentWishesList.slice().reverse().map(function(w){return w.n+(w.c?' ('+w.c+')':'')+': '+w.m}).join('\n\n');
    }

    $('ad-wcsv').addEventListener('click',function(){
      if(!currentWishesList.length){toast('अभी कोई आशीर्वाद नहीं','No wishes yet');return}
      try{
        var b=new Blob(['\ufeff'+csvText()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(b),a=el('a');
        a.href=url;a.download='guestbook-wishes.csv';DOC.body.appendChild(a);a.click();DOC.body.removeChild(a);
        setTimeout(function(){URL.revokeObjectURL(url)},4000);
      }catch(e){toast('डाउनलोड नहीं हो सका — "सब कॉपी करें" दबाएँ','Download failed — try Copy all')}
    });
    $('ad-wcopy').addEventListener('click',function(){
      if(!currentWishesList.length){toast('अभी कोई आशीर्वाद नहीं','No wishes yet');return}
      copyText(plainText(),function(ok){ok?toast('सभी आशीर्वाद कॉपी हो गए','All wishes copied'):toast('कॉपी नहीं हो सका','Couldn’t copy')});
    });

    function setViewState(authed){
      if(loginDiv && bodyDiv){
        loginDiv.hidden=authed;
        bodyDiv.hidden=!authed;
      }
      if(authed){
        loadHostData();
      }
    }

    function verifyAndUnlock(){
      var pwd=pwdI?pwdI.value.trim():'';
      if(!pwd){
        if(authErr)authErr.textContent=isHi()?'कृपया पासकोड दर्ज करें':'Please enter passcode';
        return;
      }
      if(authErr)authErr.textContent='';
      if(unlockBtn)unlockBtn.disabled=true;

      if(SBX.enabled){
        SBX.use(function(client){
          client.rpc('host_verify_passcode', {passcode: pwd}).then(function(res){
            if(unlockBtn)unlockBtn.disabled=false;
            if(res.data===true){
              authPasscode=pwd;
              try{sessionStorage.setItem('wd-ad-auth', pwd)}catch(e){}
              setViewState(true);
            }else{
              if(authErr)authErr.textContent=isHi()?'गलत पासकोड':'Incorrect passcode';
            }
          });
        }, function(){
          if(unlockBtn)unlockBtn.disabled=false;
          // Fallback if offline: allow device local view
          setViewState(true);
        });
      }else{
        if(unlockBtn)unlockBtn.disabled=false;
        setViewState(true);
      }
    }

    if(unlockBtn)unlockBtn.addEventListener('click', verifyAndUnlock);
    if(pwdI)pwdI.addEventListener('keydown', function(e){if(e.key==='Enter')verifyAndUnlock()});

    if(logoutBtn)logoutBtn.addEventListener('click', function(){
      authPasscode='';
      try{sessionStorage.removeItem('wd-ad-auth')}catch(e){}
      if(pwdI)pwdI.value='';
      setViewState(false);
    });

    function open(){
      opener=DOC.activeElement;box.hidden=false;DOC.body.style.overflow='hidden';
      upd();applyLang();
      if(authPasscode){
        setViewState(true);
      }else{
        setViewState(false);
        if(pwdI)setTimeout(function(){pwdI.focus()},50);
      }
    }
    function close(){box.hidden=true;DOC.body.style.overflow='';if(opener&&opener.focus)try{opener.focus()}catch(e){}}

    foot.addEventListener('click',function(){var n=Date.now();taps.push(n);taps=taps.filter(function(t){return n-t<900});if(taps.length>=3){taps=[];open()}});
    $('ad-close').addEventListener('click',close);
    box.addEventListener('click',function(e){if(e.target===box)close()});
    DOC.addEventListener('keydown',function(e){
      if(box.hidden)return;
      if(e.key==='Escape'){close();return}
      if(e.key==='Tab'){var f=qa('button,input,a[href]',box).filter(function(n){return !n.disabled&&n.offsetParent!==null});if(!f.length)return;var a=f[0],z=f[f.length-1];
        if(e.shiftKey&&DOC.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&DOC.activeElement===z){e.preventDefault();a.focus()}}
    });
    nameI.addEventListener('input',upd);
    $('ad-copy').addEventListener('click',function(){copyText(linkI.value,function(ok){ok?toast('लिंक कॉपी हो गया','Link copied'):(linkI.select(),toast('लिंक चुना गया — कॉपी करें','Link selected — please copy it'))})});
    $('ad-reset').addEventListener('click',function(){
      if(window.confirm('Reset RSVP data stored on this device? / इस उपकरण का RSVP डेटा मिटाएँ?')){try{localStorage.removeItem('wd-rsvps');localStorage.removeItem('wd-rsvp-me')}catch(e){}loadHostData();toast('डेटा मिटा दिया गया','Data cleared — reload to reset the form')}
    });
  })();

  prefillNames();
  applyLang();
})();
