(function(){
  document.documentElement.className+=' js';
  function $(i){return document.getElementById(i)}
  var rh=$('r-hi'),re=$('r-en');
  function isHi(){return !(re&&re.checked)}
  try{var sv=localStorage.getItem('wd-lang'); if(sv==='en'&&re){re.checked=true}else if(sv==='hi'&&rh){rh.checked=true}}catch(e){}
  function onLang(){
    var hi=isHi();
    try{localStorage.setItem('wd-lang',hi?'hi':'en')}catch(e){}
    document.documentElement.lang=hi?'hi':'en';
    if(window.__applyLang)window.__applyLang();
    tick();
  }
  try{
    if(rh){rh.addEventListener('change',onLang);rh.addEventListener('click',onLang)}
    if(re){re.addEventListener('change',onLang);re.addEventListener('click',onLang)}
  }catch(e){}
  onLang();

  // wedding: 16 Nov 2026, Barat 8 PM IST = 14:30 UTC
  var target=Date.UTC(2026,10,16,14,30,0);
  var ids=[$('c-d'),$('c-h'),$('c-m'),$('c-s')], note=$('c-note');
  function p(n){return n<10?'0'+n:''+n}
  function tick(){
    try{
      var d=target-new Date().getTime(), hi=isHi();
      if(d<=0){for(var i=0;i<4;i++){if(ids[i])ids[i].textContent='00'} if(note)note.textContent=hi?'शुभ विवाह का समय आ गया है।':'The celebration has begun.';return}
      var s=Math.floor(d/1000);
      if(ids[0])ids[0].textContent=Math.floor(s/86400);
      if(ids[1])ids[1].textContent=p(Math.floor(s%86400/3600));
      if(ids[2])ids[2].textContent=p(Math.floor(s%3600/60));
      if(ids[3])ids[3].textContent=p(s%60);
      if(note)note.textContent=hi?'अमृतसर में आपका स्वागत है।':'We look forward to welcoming you in Amritsar.';
    }catch(e){}
  }
  tick(); setInterval(tick,1000);
})();

/* =====================================================================
   INTERACTIVE FEATURES & SUPABASE INTEGRATION
   Backend: Supabase (PostgreSQL with Row Level Security & Realtime)
   - Background Music Player with Mute Toggle & Tab Lifecycle
   - RSVP: Stored privately in Supabase (max 3 records per phone number, upsert support)
   - Pushp Varsha: Atomic shared counter with realtime updates
   - Song Jukebox: Public song requests with upvoting & realtime ranking
   - Floating Diyas: Public lake drift with realtime broadcast
   - Guestbook / Wishes: Stored in Supabase with realtime public sync
   - Host Panel: Protected by host authentication; live RSVP/Wishes export with Excel CSV
   ===================================================================== */
(function(){
  'use strict';

  /* ---- CONFIG ---- */
  var WA_GROUP_URL='https://chat.whatsapp.com/HcYo4IcvSz9E0eE0SPuYUY?s=cl&p=a&mlu=4&ilr=4&iam=2';
  var HOST_WA='919855582403';
  var VENUE='Freedom Grand, G T Road, Opposite Nexus Mall, Amritsar';

  var SB_URL='https://ccztjqrooksobsujfrgb.supabase.co';
  var SB_KEY='sb_publishable_MeNhfOye2Xc6HakRYOOm8Q_EBXrgppe';

  /* shared between wishes wall and host panel */
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

  /* ---- background music player ---- */
  (function(){
    var audio=$('bg-music'), musicBtn=$('music-btn'), mIcon=$('m-icon');
    if(!audio)return;

    // Default volume: medium-low (0.25)
    audio.volume = 0.25;
    audio.muted = false;

    // Glitch skip (03:12 – 03:34): if between 191.5s and 215s, jump directly to 215s
    audio.addEventListener('timeupdate', function(){
      if(audio.currentTime >= 191.5 && audio.currentTime < 215){
        audio.currentTime = 215;
      }
    });

    // Default: Always Music ON (userMuted = false on every fresh load)
    // Do NOT read or persist mute state in localStorage or sessionStorage
    var userMuted = false;

    function updateMusicUI(){
      if(!musicBtn) return;
      musicBtn.classList.toggle('muted', userMuted);
      if(mIcon) mIcon.textContent = userMuted ? '🔇' : '🔊';
      musicBtn.setAttribute('aria-label', userMuted ? 'Unmute background music' : 'Mute background music');
    }

    var gestureEvents = ['click', 'touchend', 'pointerup', 'keydown', 'touchstart'];
    var listenersAttached = false;

    function removeGestureListeners(){
      if(!listenersAttached) return;
      gestureEvents.forEach(function(evt){
        window.removeEventListener(evt, onUserGesture, { capture: true });
        DOC.removeEventListener(evt, onUserGesture, { capture: true });
      });
      listenersAttached = false;
    }

    function addGestureListeners(){
      if(listenersAttached) return;
      gestureEvents.forEach(function(evt){
        window.addEventListener(evt, onUserGesture, { capture: true, passive: true });
        DOC.addEventListener(evt, onUserGesture, { capture: true, passive: true });
      });
      listenersAttached = true;
    }

    function attemptPlay(){
      if(userMuted || !audio) return;
      audio.muted = false;
      var p = audio.play();
      if(p && p.then){
        p.then(function(){
          if(!audio.paused){
            removeGestureListeners();
          }
        }).catch(function(){
          // Autoplay blocked by browser pending user gesture.
          // Keep gesture listeners active; NEVER set userMuted=true or switch icon to mute!
          if(!userMuted){
            addGestureListeners();
          }
        });
      }
    }

    function onUserGesture(e){
      if(userMuted || !audio) return;
      if(!audio.paused){
        removeGestureListeners();
        return;
      }
      attemptPlay();
    }

    // Set UI to Music ON (🔊) immediately on load
    updateMusicUI();

    // Attempt immediate play on load & attach gesture listeners until it succeeds
    attemptPlay();
    addGestureListeners();

    // Active webapp lifecycle (pause on tab switch / lock, resume on return if not userMuted)
    DOC.addEventListener('visibilitychange', function(){
      if(DOC.hidden){
        if(audio && !audio.paused) audio.pause();
      } else {
        if(!userMuted && audio && audio.paused) attemptPlay();
      }
    });
    window.addEventListener('pagehide', function(){
      if(audio && !audio.paused) audio.pause();
    });

    // Top toggle button (manual user mute/unmute)
    if(musicBtn){
      musicBtn.addEventListener('click', function(e){
        if(e && e.stopPropagation) e.stopPropagation();
        if(userMuted){
          userMuted = false;
          updateMusicUI();
          attemptPlay();
        } else {
          userMuted = true;
          updateMusicUI();
          if(audio) audio.pause();
          removeGestureListeners();
        }
      }, { capture: true });
    }
  })();

  /* ---- accessible unified modal manager ---- */
  var MODAL=(function(){
    var activeModal=null, opener=null;
    function open(id, triggerEl){
      var m = typeof id==='string' ? $(id) : id;
      if(!m) return;
      opener = triggerEl || DOC.activeElement;
      activeModal = m;
      m.hidden = false;
      DOC.body.classList.add('modal-open');
      var closeBtn = q('.mx', m);
      if(closeBtn) setTimeout(function(){try{closeBtn.focus()}catch(e){}}, 50);
    }
    function close(id){
      var m = id ? (typeof id==='string' ? $(id) : id) : activeModal;
      if(!m) return;
      m.hidden = true;
      if(activeModal===m) activeModal = null;
      if(!q('.modal:not([hidden])')){
        DOC.body.classList.remove('modal-open');
      }
      if(opener && opener.focus) try{opener.focus()}catch(e){}
      opener = null;
    }
    // Global backdrop click & Escape key listeners
    DOC.addEventListener('keydown', function(e){
      if(e.key==='Escape' && activeModal && !activeModal.hidden){
        close(activeModal);
      }
    });
    qa('.modal').forEach(function(m){
      m.addEventListener('click', function(e){
        if(e.target===m) close(m);
      });
      var mx=q('.mx', m);
      if(mx) mx.addEventListener('click', function(){close(m)});
    });
    return { open: open, close: close, current: function(){return activeModal} };
  })();

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
  window.__applyLang = applyLang;
  ['r-hi','r-en'].forEach(function(id){var n=$(id);if(n){n.addEventListener('change',applyLang);n.addEventListener('click',applyLang)}});
  applyLang();

  /* ---- particle engine (confetti + petals) ---- */
  function makeFx(cv,full){
    var cx=cv.getContext('2d'),parts=[],raf=0,last=0,W=0,H=0,dpr=Math.min(window.devicePixelRatio||1,2);
    var isVisible = true;

    if(!full && 'IntersectionObserver' in window){
      var cvObs=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          isVisible = entry.isIntersecting;
          if(isVisible && parts.length && !raf){
            last=0;
            raf=requestAnimationFrame(step);
          }
        });
      }, {threshold: 0.05});
      cvObs.observe(cv);
    }

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
      if(!isVisible){raf=0;return}
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
      add:function(a){for(var i=0;i<a.length;i++)parts.push(a[i]);if(!raf&&isVisible){last=0;raf=requestAnimationFrame(step)}}
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

  /* ---- RSVP wizard (with Supabase persistence, conditional travel no & upsert support) ---- */
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

    function updateTravelModeField(modeVal){
      var wrap=$('rv-travel-no-wrap');
      var inp=$('rv-travel-no');
      var lblHi=$('rv-travel-no-hi');
      var lblEn=$('rv-travel-no-en');
      if(!wrap||!inp)return;

      if(modeVal==='train'){
        wrap.hidden=false;
        if(lblHi)lblHi.textContent='ट्रेन नंबर या नाम (वैकल्पिक)';
        if(lblEn)lblEn.textContent='Train Number / Name (Optional)';
        inp.placeholder = isHi() ? 'जैसे: 12013 / शताब्दी एक्सप्रेस' : 'e.g. 12013 / Shatabdi Express';
        inp.setAttribute('data-ph-hi','जैसे: 12013 / शताब्दी एक्सप्रेस');
        inp.setAttribute('data-ph-en','e.g. 12013 / Shatabdi Express');
      }else if(modeVal==='flight'){
        wrap.hidden=false;
        if(lblHi)lblHi.textContent='फ्लाइट नंबर (वैकल्पिक)';
        if(lblEn)lblEn.textContent='Flight Number (Optional)';
        inp.placeholder = isHi() ? 'जैसे: 6E-2134 / AI-461' : 'e.g. 6E-2134 / AI-461';
        inp.setAttribute('data-ph-hi','जैसे: 6E-2134 / AI-461');
        inp.setAttribute('data-ph-en','e.g. 6E-2134 / AI-461');
      }else{
        wrap.hidden=true;
        inp.value='';
        S.travel_number='';
      }
    }

    qa('input[name="rv-mode"]', form).forEach(function(r){
      r.addEventListener('change', function(){
        updateTravelModeField(this.value);
      });
    });

    function collect(){
      S.name=clean(val('rv-name'),60);S.phone=clean(val('rv-phone'),20);S.att=radio('rv-att');
      S.cnt=val('rv-count')||'1';S.cntx=val('rv-countx');S.days=days();
      S.arr=val('rv-arr');S.slot=radio('rv-slot');S.time=val('rv-time');S.mode=radio('rv-mode');
      S.travel_number=(S.mode==='train'||S.mode==='flight')?clean(val('rv-travel-no'),40):'';
      lsSet('wd-rsvp-me',S);
    }
    function fill(){
      var rn=$('rv-name'),rp=$('rv-phone'),rc=$('rv-count'),rcx=$('rv-countx'),rcxw=$('rv-countx-w'),ra=$('rv-arr'),rt=$('rv-time'),trv=$('rv-travel-no');
      if(rn)rn.value=S.name||myName();if(rp)rp.value=S.phone||'';setRadio('rv-att',S.att||'');
      if(rc)rc.value=S.cnt||'1';if(rcx)rcx.value=S.cntx||'';if(rcxw)rcxw.hidden=(rc&&rc.value!=='15+');
      setDays(S.days||[]);if(ra)ra.value=S.arr||'';setRadio('rv-slot',S.slot||'');if(rt)rt.value=S.time||'';setRadio('rv-mode',S.mode||'');
      if(trv)trv.value=S.travel_number||'';
      updateTravelModeField(S.mode||radio('rv-mode'));
    }
    function showErr(m){if(!err)return;err.textContent='';if(m){err.appendChild(el('span','hi',m[0]));err.appendChild(el('span','en',m[1]))}}
    function validate(n){
      if(n===1){
        if(!S.name)return['कृपया अपना नाम लिखें','Please enter your name'];
        var d=digits();if(d.length!==10)return['कृपया 10 अंकों का सही मोबाइल नंबर लिखें','Please enter a valid 10-digit phone number'];
        if(!S.att)return['कृपया चुनें कि आप पधारेंगे या नहीं','Please choose Attending or Not Attending'];
      }
      if(n===2){
        if(S.cnt==='15+'){var x=parseInt(S.cntx,10);if(!(x>15&&x<=300))return['कृपया कुल संख्या लिखें (16 या अधिक)','Please enter the exact number (16 or more)']}
        if(!S.days||!S.days.length)return['कृपया कम से कम एक दिन चुनें','Please choose at least one day'];
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
      all[d]={
        id:S.id||null,
        name:S.name,
        att:S.att,
        cnt:S.att==='yes'?count():0,
        days:S.att==='yes'?(S.days||[]):[],
        arrival_date:S.att==='yes'&&S.arr?parseInt(S.arr,10):null,
        arrival_slot:S.att==='yes'?S.slot:null,
        arrival_time:S.att==='yes'?(S.time||null):null,
        travel_mode:S.att==='yes'?S.mode:null,
        travel_number:S.att==='yes'?(S.travel_number||null):null,
        joined:!!S.joined,
        grp:S.joined?(S.grp||count()):0,
        ts:Date.now()
      };
      lsSet('wd-rsvps',all);
    }
    function show(n,noScroll){
      step=n;
      panels.forEach(function(p,i){if(p)p.classList.toggle('on',i===n-1)});
      dots.forEach(function(d,i){d.classList.toggle('on',i===n-1);d.classList.toggle('done',i<n-1)});
      if(back)back.hidden=(n===1);if(next){next.hidden=(n===4);next.classList.toggle('last',n===3)}
      showErr(null);
      if(!noScroll){var r=form.getBoundingClientRect();if(r.top<0||r.top>window.innerHeight*.5)smoothTo(form,'start')}
    }

    /* step 4 */
    function groupHref(){return WA_GROUP_URL}
    function refreshLinks(){
      var gBtn=$('rv-grp-btn');
      if(gBtn) gBtn.href=groupHref();
    }
    function sumLine(ul,lhi,len,vhi,ven){var li=el('li');li.appendChild(bi(lhi,len));li.appendChild(bi(vhi,ven));ul.appendChild(li)}
    function buildStep4(){
      var n=count(),ul=$('rv-sum');
      if(ul){
        ul.textContent='';
        var dd=(S.days||[]).join(', ');
        sumLine(ul,'नाम','Name',S.name,S.name);
        sumLine(ul,'सदस्य','Members',String(n),String(n));
        sumLine(ul,'दिन','Days',dd+' नवंबर',dd+' Nov');
        var sl=SLOT[S.slot]||['',''],tm=S.time?' · '+fmtTime(S.time):'',md=MODE[S.mode]||['',''];
        var trvNo=(S.travel_number&&(S.mode==='train'||S.mode==='flight'))?' ('+S.travel_number+')':'';
        sumLine(ul,'आगमन','Arrival',S.arr+' नवंबर · '+sl[0]+tm+' · '+md[0]+trvNo,S.arr+' Nov · '+sl[1]+tm+' · '+md[1]+trvNo);
      }
      refreshLinks();
    }
    function persist(){lsSet('wd-rsvp-me',S)}

    function saveRsvpToSupabase(onDone){
      var payload={
        p_id: S.id || null,
        p_name: S.name,
        p_phone: digits(),
        p_attending: S.att,
        p_member_count: S.att==='yes'?count():0,
        p_member_count_exact: S.cnt==='15+'?(parseInt(S.cntx,10)||null):null,
        p_days: S.att==='yes'?(S.days||[]):null,
        p_arrival_date: S.att==='yes'&&S.arr?parseInt(S.arr,10):null,
        p_arrival_slot: S.att==='yes'?S.slot:null,
        p_arrival_time: S.att==='yes'?(S.time||null):null,
        p_travel_mode: S.att==='yes'?S.mode:null,
        p_travel_number: S.att==='yes'?(S.travel_number||null):null,
        p_wa_group_joined: !!S.joined,
        p_wa_group_count: S.joined?(S.grp||count()):0
      };

      if(!SBX.enabled){
        if(onDone)onDone(null);
        return;
      }

      SBX.use(function(client){
        client.rpc('upsert_rsvp', payload).then(function(res){
          if(res.error){
            if(res.error.code==='P0001' || (res.error.message && res.error.message.indexOf('maximum allowed')>-1)){
              if(onDone)onDone(['इस मोबाइल नंबर से अधिकतम 3 RSVP पहले ही दर्ज हैं।', 'This mobile number already has 3 RSVP records (maximum allowed).']);
            }else{
              if(onDone)onDone(['RSVP सहेजने में समस्या आई — कृपया पुनः प्रयास करें।', 'Could not save RSVP — please try again.']);
            }
          }else{
            if(res.data){
              S.id=res.data;
              persist();
            }
            if(onDone)onDone(null);
          }
        });
      }, function(){
        if(onDone)onDone(null);
      });
    }

    if(next){
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
            S.done=true;S.grp=count();persist();record();buildStep4();show(4);
            confetti(window.innerWidth/2, window.innerHeight/2);
            toast('आपकी उपस्थिति दर्ज हो गई 🎉','RSVP saved 🎉');
          });
        }
      });
    }
    if(back)back.addEventListener('click',function(){if(step>1)show(step-1)});
    var rCount=$('rv-count');if(rCount)rCount.addEventListener('change',function(){var w=$('rv-countx-w');if(w)w.hidden=(this.value!=='15+')});
    var rAllDays=$('rv-alldays');if(rAllDays)rAllDays.addEventListener('click',function(){setDays([12,13,15,16])});
    var rTime=$('rv-time');if(rTime)rTime.addEventListener('change',function(){if(this.value&&!radio('rv-slot'))setRadio('rv-slot',slotOf(this.value))});
    form.addEventListener('submit',function(e){e.preventDefault()});

    var grpBtn=$('rv-grp-btn');
    if(grpBtn){
      grpBtn.addEventListener('click', function(){
        S.joined=true;
        S.grp=count();
        record();
        persist();
        saveRsvpToSupabase(function(){});
      });
    }

    /* Update RSVP Information button */
    var updateBtn=$('rv-update-btn');
    if(updateBtn){
      updateBtn.addEventListener('click', function(){
        fill();
        show(1);
        toast('आप अपनी RSVP जानकारी अपडेट कर सकते हैं','You can now update your RSVP information');
      });
    }

    /* init */
    fill();
    if(S.done&&S.att==='yes'&&!validate(1)&&!validate(2)&&!validate(3)){buildStep4();show(4,true)}else show(1,true);
  })();

  /* ---- wishes wall / guestbook: live Supabase sync + popup modal ---- */
  (function(){
    var f=$('wh-form');if(!f)return;
    var BADGE={ash:['🙏','आशीर्वाद','Ashirwad'],shub:['🌸','शुभकामनाएँ','Best Wishes'],love:['❤️','स्नेह','With Love'],bad:['🎉','बधाई','Congratulations']};
    var PRE=[
      ['आपका साथ प्रेम, हँसी और अनंत खुशियों से भरा रहे। मनीषा और अतुल को हार्दिक बधाई!','May your journey together be filled with love, laughter and endless joy. Congratulations Manisha & Atul!'],
      ['आप दोनों को जीवन भर की खुशियाँ मिलें। ईश्वर का आशीर्वाद सदा आप पर बना रहे।','Wishing you a lifetime of happiness. God bless you both.'],
      ['सशरीर उपस्थित न हो पाने का खेद है, पर मेरा आशीर्वाद आप दोनों के साथ है।','Sorry I can’t be there in person, but my blessings are with you both.'],
      ['आपके साथ जश्न मनाने का इंतज़ार है! अमृतसर में मिलते हैं।','Can’t wait to celebrate with you! See you in Amritsar.']];

    var wishes=lsGet('wd-wishes',[]),mine=lsGet('wd-wlikes',{});
    var list=$('wh-list'),modalList=$('wh-modal-list'),empty=$('wh-empty'),err=$('wh-err'),share=$('wh-share'),viewAllBtn=$('wh-view-all');
    var modalCloseBtn=$('wh-modal-close'),modalBackBtn=$('wh-modal-back'),modalCount=$('wh-modal-count');

    WALL.get=function(){return wishes};

    function saveLocal(){lsSet('wd-wishes',wishes.slice(0,100));lsSet('wd-wlikes',mine)}

    function buildWishCard(w){
      var b=BADGE[w.b]||BADGE.ash,c=el('div','wcard'),h=el('div','wh'),who=el('div'),r=el('button','react');
      who.appendChild(el('div','wn',w.n));if(w.c)who.appendChild(el('div','wc',w.c));
      var bd=el('span','wb');bd.appendChild(el('span','',b[0]+' '));bd.appendChild(bi(b[1],b[2]));h.appendChild(who);h.appendChild(bd);
      c.appendChild(h);c.appendChild(el('p','wm',w.m));
      r.type='button';r.setAttribute('aria-pressed',mine[w.id]?'true':'false');
      r.appendChild(el('span','','❤️'));r.appendChild(bi('आशीर्वाद','Ashirwad'));r.appendChild(el('span','',String(w.l||0)));
      r.addEventListener('click',function(){like(w)});
      c.appendChild(r);
      return c;
    }

    function render(){
      // Inline list: max 3 latest wishes
      if(list){
        list.textContent='';
        var inlineItems=wishes.slice(0,3);
        inlineItems.forEach(function(w){
          list.appendChild(buildWishCard(w));
        });
      }
      // Modal list: full archive
      if(modalList){
        modalList.textContent='';
        wishes.forEach(function(w){
          modalList.appendChild(buildWishCard(w));
        });
      }
      if(empty)empty.hidden=wishes.length>0;

      // Update count indicators
      qa('.wh-cnt-txt').forEach(function(node){node.textContent=String(wishes.length)});
      if(modalCount)modalCount.textContent='('+wishes.length+')';
      if(viewAllBtn)viewAllBtn.hidden=(wishes.length<=3);

      if(WALL.onChange)WALL.onChange();
    }

    function like(w){
      var on=!mine[w.id];
      if(on)mine[w.id]=1;else delete mine[w.id];
      w.l=Math.max(0,(w.l||0)+(on?1:-1));
      saveLocal();render();
      if(SBX.enabled && w.id && w.id.indexOf('-')>-1){
        SBX.use(function(client){
          client.rpc('increment_likes',{wish_id:w.id, delta:on?1:-1});
        });
      }
    }

    function setErr(m){if(!err)return;err.textContent='';if(m){err.appendChild(el('span','hi',m[0]));err.appendChild(el('span','en',m[1]))}}
    qa('.pre',f).forEach(function(b){b.addEventListener('click',function(){var t=PRE[+b.getAttribute('data-i')];$('wh-msg').value=t[isHi()?0:1];setErr(null)})});

    function loadSupabaseWishes(client){
      client.from('wishes').select('*').order('created_at',{ascending:false}).limit(100).then(function(res){
        if(res.data && res.data.length>=0){
          wishes=res.data.map(function(r){
            return {
              id: r.id,
              n: r.name,
              c: r.city||'',
              m: r.message,
              b: r.badge||'ash',
              l: r.likes||0,
              ts: new Date(r.created_at).getTime()
            };
          });
          saveLocal();
          render();
        }
      });
    }

    if(SBX.enabled){
      SBX.use(function(client){
        loadSupabaseWishes(client);
        try{
          client.channel('public:wishes')
            .on('postgres_changes', {event:'*', schema:'public', table:'wishes'}, function(){
              loadSupabaseWishes(client);
            })
            .subscribe();
        }catch(e){}
      });
    }

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
            if(!res.error && client){
              loadSupabaseWishes(client);
            }
          });
        });
      }

      $('wh-msg').value='';
      if(share){
        share.href='https://wa.me/'+HOST_WA+'?text='+encodeURIComponent('Blessing from '+n+(c?' ('+c+')':'')+':\n'+m);
        share.hidden=false;
      }
      toast('आपका आशीर्वाद परिवार तक पहुँच गया 🙏','Your blessing is saved for the family 🙏');
    });

    if(viewAllBtn){
      viewAllBtn.addEventListener('click',function(){
        MODAL.open('wishes-modal', this);
      });
    }
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', function(){ MODAL.close('wishes-modal'); });
    if(modalBackBtn) modalBackBtn.addEventListener('click', function(){ MODAL.close('wishes-modal'); });

    render();
  })();

  /* ---- family directory: category filter ---- */
  (function(){
    var groups=qa('.fam .grp');if(!groups.length)return;
    var chips=qa('.fchip'),cur='all';
    function apply(){
      groups.forEach(function(g,gi){
        g.hidden=!(cur==='all'||+cur===gi);
      });
    }
    chips.forEach(function(ch){
      ch.addEventListener('click',function(){
        cur=ch.getAttribute('data-f');
        chips.forEach(function(o){o.setAttribute('aria-pressed',o===ch?'true':'false')});
        apply();
      });
    });
    apply();
  })();

  /* ---- Sangeet jukebox (shared via Supabase with realtime rankings & votes) ---- */
  (function(){
    var f=$('sg-form');if(!f)return;
    var live=false,pending=SBX.enabled;
    var songs=lsGet('wd-songs',[]),mine=lsGet('wd-svotes',{});
    var list=$('sg-list'),modalList=$('sg-modal-list'),empty=$('sg-empty'),err=$('sg-err'),viewAllBtn=$('sg-view-all');
    var modalCloseBtn=$('sg-modal-close'),modalBackBtn=$('sg-modal-back'),modalCount=$('sg-modal-count');

    function save(){if(!live)lsSet('wd-songs',songs.slice(0,60));lsSet('wd-svotes',mine)}
    function setErr(m){if(!err)return;err.textContent='';if(m){err.appendChild(el('span','hi',m[0]));err.appendChild(el('span','en',m[1]))}}

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

    function buildSongItem(s, idx){
      var li=el('li','song'),inf=el('div','si'),r=el('button','react');
      li.appendChild(el('div','rk',String(idx+1)));
      inf.appendChild(el('div','st',s.t));
      var meta=(s.a?s.a:'')+(s.a&&s.by?' · ':'')+(s.by?'🎤 '+s.by:'');if(meta)inf.appendChild(el('div','sa',meta));
      li.appendChild(inf);
      r.type='button';r.setAttribute('aria-pressed',mine[s.id]?'true':'false');
      r.appendChild(el('span','','🔥'));r.appendChild(el('span','',String(s.v||0)));r.setAttribute('aria-label','Upvote');
      r.addEventListener('click',function(){vote(s)});
      li.appendChild(r);
      return li;
    }

    function render(){
      songs.sort(function(a,b){return (b.v||0)-(a.v||0)||(a.ts||0)-(b.ts||0)});
      if(empty)empty.hidden=songs.length>0||pending;

      // Inline list: Top 5 songs
      if(list){
        list.textContent='';
        var inlineSongs=songs.slice(0,5);
        inlineSongs.forEach(function(s,i){
          list.appendChild(buildSongItem(s, i));
        });
      }

      // Modal list: full leaderboard
      if(modalList){
        modalList.textContent='';
        songs.forEach(function(s,i){
          modalList.appendChild(buildSongItem(s, i));
        });
      }

      // Update count indicators
      var countTotal=songs.length;
      var cHi=$('sg-total-count'),cEn=$('sg-total-count-en');
      if(cHi)cHi.textContent=String(countTotal);
      if(cEn)cEn.textContent=String(countTotal);
      if(modalCount)modalCount.textContent='('+countTotal+')';
      if(viewAllBtn)viewAllBtn.hidden=(countTotal<=5);
    }

    function loadSupabaseSongs(client){
      client.from('songs').select('*').order('votes',{ascending:false}).order('created_at',{ascending:true}).limit(100).then(function(res){
        pending=false;
        if(res.data && res.data.length>=0){
          live=true;
          songs=res.data.map(function(r){
            return {id:r.id, t:r.title, a:r.artist||'', by:r.requested_by||'', v:r.votes||0, ts:new Date(r.created_at).getTime()};
          });
          render();
        }else{
          live=false;
          render();
        }
      });
    }

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
        pending=false;live=false;render();
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

    if(viewAllBtn){
      viewAllBtn.addEventListener('click',function(){
        MODAL.open('songs-modal', this);
      });
    }
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', function(){ MODAL.close('songs-modal'); });
    if(modalBackBtn) modalBackBtn.addEventListener('click', function(){ MODAL.close('songs-modal'); });

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
    var nameI=$('ad-name'),linkI=$('ad-link'),waA=$('ad-wa'),taps=[];
    var authPasscode=sessionStorage.getItem('wd-ad-auth')||'';

    var loginDiv=$('ad-login'), bodyDiv=$('ad-body'), pwdI=$('ad-pwd'), unlockBtn=$('ad-unlock'), authErr=$('ad-err'), logoutBtn=$('ad-logout');
    var currentRsvpsList=[];

    function base(){return location.href.split(/[?#]/)[0]}
    function link(){var n=clean(nameI.value,60);return base()+(n?'?guest='+encodeURIComponent(n):'')}
    function upd(){var l=link();linkI.value=l;waA.href='https://wa.me/?text='+encodeURIComponent((nameI.value.trim()?'Dear '+clean(nameI.value,60)+',\n':'')+'You are warmly invited to the wedding of Manisha & Atul (16 Nov 2026, Amritsar).\nसादर आमंत्रण: '+l)}

    function renderStats(list){
      currentRsvpsList=list||[];
      var y=0,m=0,g=0,ul=$('ad-list');ul.textContent='';
      currentRsvpsList.forEach(function(r){
        if(r.attending==='yes'||r.att==='yes'){
          y++;
          m+=(r.member_count!=null?r.member_count:r.cnt)||0;
          g+=(r.wa_group_joined||r.joined)?(r.wa_group_count||r.grp||0):0;
        }
        var li=el('li');
        var trvInfo=(r.travel_number?' ['+r.travel_number+']':'');
        var nameSpan=el('span','',r.name + (r.phone ? ' ('+r.phone+')' : '') + trvInfo);
        li.appendChild(nameSpan);
        var isAtt = (r.attending==='yes'||r.att==='yes');
        var cntVal = (r.member_count!=null?r.member_count:r.cnt)||0;
        var grpVal = (r.wa_group_count!=null?r.wa_group_count:r.grp)||0;
        var st=isAtt?bi('✅ '+cntVal+' सदस्य'+(grpVal?' · समूह '+grpVal:''),'✅ '+cntVal+' member(s)'+(grpVal?' · group '+grpVal:'')):bi('🙏 नहीं आ पाएँगे','🙏 Not attending');
        li.appendChild(st);ul.appendChild(li);
      });
      $('st-n').textContent=currentRsvpsList.length;$('st-y').textContent=y;$('st-m').textContent=m;$('st-g').textContent=g;
    }

    function loadHostData(){
      if(SBX.enabled && authPasscode){
        SBX.use(function(client){
          client.rpc('host_get_rsvps', {passcode: authPasscode}).then(function(res){
            if(res.data && !res.error){
              renderStats(res.data);
            }
          });
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
        var all=lsGet('wd-rsvps',{}),ks=Object.keys(all),list=[];
        ks.forEach(function(k){list.push(all[k])});
        renderStats(list);
        renderWishes(WALL.get(), false);
      }
    }

    /* ---- RSVP Excel (.csv) export ---- */
    var SLOT={morning:['प्रातः','Morning'],afternoon:['दोपहर','Afternoon'],evening:['सायं','Evening'],night:['रात्रि','Night']};
    var MODE={train:['🚆 रेल','🚆 Train'],flight:['✈️ विमान','✈️ Flight'],car:['🚗 कार','🚗 Car'],bus:['🚌 बस','🚌 Bus']};
    function fmtTime(t){if(!t)return '';var a=t.split(':'),h=+a[0],m=a[1],ap=h>=12?'PM':'AM';h=h%12||12;return h+':'+m+' '+ap}

    function rsvpCsvText(){
      var headers = [
        'Guest Name',
        'Attending Status',
        'Members Count',
        'Selected Days',
        'Arrival Date',
        'Arrival Slot',
        'Travel Mode',
        'Train / Flight No.',
        'Notes',
        'Submitted At'
      ];
      var rows = [headers];
      currentRsvpsList.forEach(function(r){
        var isAtt = (r.attending === 'yes' || r.att === 'yes');
        var cnt = isAtt ? ((r.member_count_exact != null ? r.member_count_exact : r.member_count) || r.cnt || 1) : 0;
        var days = (r.days || []).map(function(d){ return d + ' Nov'; }).join('; ');
        var arrDate = r.arrival_date ? r.arrival_date + ' Nov' : (r.arr ? r.arr + ' Nov' : '');
        var slotName = r.arrival_slot ? (SLOT[r.arrival_slot] ? SLOT[r.arrival_slot][1] : r.arrival_slot) : '';
        var exactTime = r.arrival_time ? ' (' + fmtTime(r.arrival_time) + ')' : '';
        var arrSlot = (slotName || exactTime) ? (slotName + exactTime) : '';
        var modeName = r.travel_mode ? (MODE[r.travel_mode] ? MODE[r.travel_mode][1].replace(/^\S+\s/,'') : r.travel_mode) : '';
        var trvNo = r.travel_number || '';
        var notes = (r.wa_group_joined || r.joined) ? ('WhatsApp Group Joined (Party of ' + ((r.wa_group_count!=null?r.wa_group_count:r.grp)||cnt||1) + ')') : 'WhatsApp Group: Not yet';
        var submittedAt = fmtWhen(r.created_at || r.ts);
        rows.push([
          r.name || '',
          isAtt ? 'Attending' : 'Not Attending',
          cnt,
          days,
          arrDate,
          arrSlot,
          modeName,
          trvNo,
          notes,
          submittedAt
        ]);
      });
      return rows.map(function(row){ return row.map(csvCell).join(','); }).join('\r\n');
    }

    var adRsvpExcel = $('ad-rsvpexcel');
    if(adRsvpExcel){
      adRsvpExcel.addEventListener('click', function(){
        if(!currentRsvpsList.length){
          toast('अभी कोई RSVP डेटा नहीं है', 'No RSVP data yet');
          return;
        }
        try {
          var b = new Blob(['\ufeff' + rsvpCsvText()], { type: 'text/csv;charset=utf-8' });
          var url = URL.createObjectURL(b), a = el('a');
          a.href = url;
          a.download = 'Manisha-Atul-Wedding-RSVPs.csv';
          DOC.body.appendChild(a);
          a.click();
          DOC.body.removeChild(a);
          setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
          toast('RSVP एक्सेल डाउनलोड हो गया 📊', 'RSVP Excel downloaded 📊');
        } catch(e) {
          toast('डाउनलोड नहीं हो सका', 'Download failed');
        }
      });
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
      if(wc)wc.textContent=currentWishesList.length;if(wl)wl.textContent='';
      if(wLive)wLive.hidden=!isLive;if(wLocal)wLocal.hidden=!!isLive;
      currentWishesList.forEach(function(w){
        var li=el('li'),h=el('div','awh');h.appendChild(el('b','',w.n));
        var meta=[w.c,fmtWhen(w.ts)].filter(Boolean).join(' · ');if(meta)h.appendChild(el('span','',meta));
        li.appendChild(h);li.appendChild(el('p','awm',w.m));if(wl)wl.appendChild(li);
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

    var adWcsv=$('ad-wcsv');
    if(adWcsv){
      adWcsv.addEventListener('click',function(){
        if(!currentWishesList.length){toast('अभी कोई आशीर्वाद नहीं','No wishes yet');return}
        try{
          var b=new Blob(['\ufeff'+csvText()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(b),a=el('a');
          a.href=url;a.download='guestbook-wishes.csv';DOC.body.appendChild(a);a.click();DOC.body.removeChild(a);
          setTimeout(function(){URL.revokeObjectURL(url)},4000);
        }catch(e){toast('डाउनलोड नहीं हो सका — "सब कॉपी करें" दबाएँ','Download failed — try Copy all')}
      });
    }
    var adWcopy=$('ad-wcopy');
    if(adWcopy){
      adWcopy.addEventListener('click',function(){
        if(!currentWishesList.length){toast('अभी कोई आशीर्वाद नहीं','No wishes yet');return}
        copyText(plainText(),function(ok){ok?toast('सभी आशीर्वाद कॉपी हो गए','All wishes copied'):toast('कॉपी नहीं हो सका','Couldn’t copy')});
      });
    }

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

    function openAdmin(){
      MODAL.open('admin', foot);
      upd();applyLang();
      if(authPasscode){
        setViewState(true);
      }else{
        setViewState(false);
        if(pwdI)setTimeout(function(){pwdI.focus()},50);
      }
    }

    foot.addEventListener('click',function(){var n=Date.now();taps.push(n);taps=taps.filter(function(t){return n-t<900});if(taps.length>=3){taps=[];openAdmin()}});
    var adClose=$('ad-close');if(adClose)adClose.addEventListener('click',function(){MODAL.close('admin')});
    if(nameI)nameI.addEventListener('input',upd);
    var adCopy=$('ad-copy');if(adCopy)adCopy.addEventListener('click',function(){copyText(linkI.value,function(ok){ok?toast('लिंक कॉपी हो गया','Link copied'):(linkI.select(),toast('लिंक चुना गया — कॉपी करें','Link selected — please copy it'))})});
  })();

  /* ---- Mobile App Shell Bottom Navigation Bar & Smooth Scroll ---- */
  (function(){
    var bnav = $('bnav');
    var items = bnav ? qa('.bnav-item', bnav) : [];
    var secIds = ['events', 'venue', 'rsvp', 'jukebox', 'wishes'];
    var secs = secIds.map(function(id){ return $(id); }).filter(Boolean);

    function setActive(id){
      items.forEach(function(item){
        var match = item.getAttribute('data-sec') === id;
        item.classList.toggle('active', match);
      });
    }

    if('IntersectionObserver' in window && secs.length){
      var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            setActive(entry.target.id);
          }
        });
      }, {
        rootMargin: '-20% 0px -50% 0px',
        threshold: 0
      });
      secs.forEach(function(sec){ obs.observe(sec); });
    }

    // Smooth scroll for nav items
    items.forEach(function(item){
      item.addEventListener('click', function(e){
        var secId = item.getAttribute('data-sec');
        var target = $(secId);
        if(target){
          e.preventDefault();
          smoothTo(target, 'start');
          setActive(secId);
        }
      });
    });
  })();

  prefillNames();
  applyLang();
})();
