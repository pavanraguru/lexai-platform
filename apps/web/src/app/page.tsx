// apps/web/src/app/page.tsx
// Marketing homepage — stops the redirect('/dashboard') behaviour

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sovereign Counsel — AI Legal Intelligence for Indian Advocates',
  description: 'Eight AI agents purpose-built for Indian courts. Draft bail applications, research precedents, build strategies.',
};

export default function HomePage() {
  return (
    <>
      <style>{`body{background:#010f1f!important}#lex-main{padding:0!important}`}</style>
      <MarketingSite />
    </>
  );
}

function MarketingSite() {
  return (
    <div id="sc-site" suppressHydrationWarning>
      <style>{STYLES}</style>
      <div className="sc-cursor" id="sc-cursor"></div>
      <div className="sc-ring" id="sc-ring"></div>

      <nav className="sc-nav" id="sc-nav">
        <a href="/" className="sc-brand">
          <div className="sc-logo-wrap">
            <div className="sc-logo">SC</div>
            <div className="sc-logo-glow"></div>
          </div>
          <span className="sc-name">Sovereign Counsel</span>
        </a>
        <div className="sc-navlinks">
          <a href="#sc-features">Platform</a>
          <a href="#sc-agents">AI Agents</a>
          <a href="#sc-pricing">Pricing</a>
        </div>
        <div className="sc-cta">
          <a href="/login" className="sc-btn-g">Log in</a>
          <a href="/login" className="sc-btn-p">Start free trial</a>
        </div>
      </nav>

      <section className="sc-hero">
        <canvas id="sc-canvas"></canvas>
        <div className="sc-hc">
          <div className="sc-eyebrow"><div className="sc-ep"></div>India&apos;s first AI-native legal practice platform</div>
          <h1 className="sc-h1">
            The counsel that never<br />
            <span className="l2">sleeps, never forgets</span>
            <span className="l3">Bail applications to board resolutions — AI-powered, India-built</span>
          </h1>
          <p className="sc-sub">Eight AI agents purpose-built for Indian courts. Draft bail applications, research precedents, build strategies, review documents — in minutes, not hours.</p>
          <div className="sc-acts">
            <a href="/login" className="sc-bmain">Begin your practice <div className="sc-arr">→</div></a>
            <a href="#sc-features" className="sc-bgh">Explore the platform</a>
          </div>
        </div>
        <div className="sc-scroll"><div className="sc-sline"></div><div className="sc-stxt">Scroll</div></div>
        <div className="sc-statsbar">
          <div className="sc-stat"><div className="sc-snum">8</div><div><div className="sc-slbl">AI Agents</div><div className="sc-ssub">Evidence to Strategy</div></div></div>
          <div className="sc-stat"><div className="sc-snum">14</div><div><div className="sc-slbl">Document Types</div><div className="sc-ssub">Bail to Writ Petition</div></div></div>
          <div className="sc-stat"><div className="sc-snum">145+</div><div><div className="sc-slbl">Tracked Events</div><div className="sc-ssub">Full audit trail</div></div></div>
          <div className="sc-stat"><div className="sc-snum">3</div><div><div className="sc-slbl">Languages</div><div className="sc-ssub">EN · TE · HI</div></div></div>
          <div className="sc-stat"><div className="sc-snum">IK</div><div><div className="sc-slbl">Citation Verified</div><div className="sc-ssub">Indian Kanoon linked</div></div></div>
        </div>
      </section>

      <div className="sc-mq">
        <div className="sc-mtrack">
          {['Sessions Court','High Court','Supreme Court','NCLT / NCLAT','Consumer Forum','IPC · CrPC · CPC','Evidence Act','Companies Act 2013','GST Compliant','Vakalatnama','Telugu · Hindi · English','Indian Kanoon',
            'Sessions Court','High Court','Supreme Court','NCLT / NCLAT','Consumer Forum','IPC · CrPC · CPC','Evidence Act','Companies Act 2013','GST Compliant','Vakalatnama','Telugu · Hindi · English','Indian Kanoon'].map((t,i)=>(
            <div key={i} className="sc-mi"><div className="sc-md"></div>{t}</div>
          ))}
        </div>
      </div>

      <section className="sc-section" id="sc-features">
        <div className="sc-si">
          <div className="sc-lbl sc-rev">The complete platform</div>
          <h2 className="sc-h2 sc-rev">Every feature your<br /><em>practice demands</em></h2>
          <div className="sc-bento">
            <div className="sc-b sc-b1 sc-rev"><span className="sc-btag sc-tlive">● Live</span><span className="sc-bico">⚖️</span><div className="sc-btitle">Case Management</div><div className="sc-bdesc">Full lifecycle across Sessions, HC, SC, NCLT, Consumer Forums. CNR tracking, court hierarchy, status, hearing history.</div></div>
            <div className="sc-b sc-b2 sc-rev"><span className="sc-btag sc-tnew">✦ New</span><span className="sc-bico">✍️</span><div className="sc-btitle">AI Document Drafter</div><div className="sc-bdesc">14 document types. Bail applications, plaints, writ petitions, legal notices, vakalatnamas — correct Indian legal language, numbered paragraphs, prayer sections. Promotes directly to Drafts.</div></div>
            <div className="sc-b sc-b3 sc-rev"><span className="sc-btag sc-tnew">✦ New</span><span className="sc-bico">🔍</span><div className="sc-btitle">Document Reviewer</div><div className="sc-bdesc">Risk score 0–100, gap analysis, missing elements, and procedural compliance flags on any uploaded document.</div></div>
            <div className="sc-b sc-b4 sc-rev"><span className="sc-btag sc-tlive">● Live</span><span className="sc-bico">📚</span><div className="sc-btitle">Legal Research</div><div className="sc-bdesc">IPC, CrPC, CPC statutes and verified precedents with Indian Kanoon links. Distinguishing adverse cases included.</div></div>
            <div className="sc-b sc-b5 sc-rev"><span className="sc-btag sc-tlive">● Live</span><span className="sc-bico">📅</span><div className="sc-btitle">Court Calendar</div><div className="sc-bdesc">Indian court holidays pre-loaded. Hearing scheduler with reminders for your team.</div></div>
            <div className="sc-b sc-b6 sc-rev"><span className="sc-btag sc-tlive">● Live</span><span className="sc-bico">💰</span><div className="sc-btitle">GST Invoicing & Billing</div><div className="sc-bdesc">Professional GST-compliant invoices. Paise-accurate billing. Client portal shows invoices directly to clients with payment tracking.</div></div>
            <div className="sc-b sc-b7 sc-rev"><span className="sc-btag sc-tlive">● Live</span><span className="sc-bico">👥</span><div className="sc-btitle">Team & Roles</div><div className="sc-bdesc">Advocates, associates, clerks. Custom permissions per feature. 145+ tracked audit events with CSV export.</div></div>
          </div>
        </div>
      </section>

      <section className="sc-section" id="sc-agents" style={{background:'rgba(255,255,255,0.01)'}}>
        <div className="sc-si">
          <div className="sc-lbl sc-rev">AI agent suite</div>
          <h2 className="sc-h2 sc-rev">Eight agents,<br /><em>one purpose</em></h2>
          <p className="sc-body sc-rev">Each agent trained on Indian law, understands court hierarchy, and speaks the correct form of address.</p>
          <div className="sc-agents">
            {[
              {n:'01 · Analysis',e:'⚖️',t:'Evidence Analyst',d:'Extracts and categorises exhibits. Finds contradictions and rates strength of each piece.'},
              {n:'02 · Analysis',e:'🕐',t:'Timeline Builder',d:'Reconstructs events chronologically. Flags prosecution gaps and defence opportunities.'},
              {n:'03 · Research',e:'📚',t:'Legal Researcher',d:'Statutes and precedents. Indian Kanoon-verified. How to distinguish adverse cases.'},
              {n:'04 · Analysis',e:'🎤',t:'Deposition Analyst',d:'Full cross-examination script — question, expected answer, follow-up if denied.'},
              {n:'05 · Strategy',e:'♟️',t:'Case Strategist',d:'Argument tree, closing skeleton, bench question bank, sentiment score.'},
              {n:'06 · Drafting',e:'✍️',t:'Document Drafter',d:'14 document types. Correct Indian legal language, numbered paragraphs, prayer sections.'},
              {n:'07 · Review',e:'🔍',t:'Document Reviewer',d:'Risk score 0–100. Gap analysis, missing elements, procedural compliance flags.'},
              {n:'08 · Summary',e:'✦',t:'Legal Summariser',d:'Plain-English summary of any document with action items and key dates.'},
            ].map((a,i)=>(
              <div key={i} className="sc-acard sc-rev"><div className="sc-anum">{a.n}</div><div className="sc-aemoji">{a.e}</div><div className="sc-aname">{a.t}</div><div className="sc-adesc">{a.d}</div></div>
            ))}
            {[
              {n:'09',e:'📋',t:'Contract Analyser',d:'Unfair terms, arbitration clauses, limitation period issues.'},
              {n:'10',e:'💬',t:'Client Communicator',d:'Drafts hearing notices, updates, and reminders for clients.'},
              {n:'11',e:'🛡️',t:'Compliance Checker',d:'SEBI, RBI, GST, Companies Act compliance checks.'},
              {n:'12',e:'📁',t:'Filing Assistant',d:'eCourts-ready filings with CIS checklists.'},
            ].map((a,i)=>(
              <div key={i} className="sc-acard sc-dim sc-rev"><div className="sc-anum">{a.n}</div><div className="sc-aemoji">{a.e}</div><div className="sc-aname">{a.t}</div><div className="sc-adesc">{a.d}</div><div className="sc-adim">Coming soon</div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="sc-section">
        <div className="sc-si" style={{position:'relative'}}>
          <div style={{maxWidth:'640px'}}>
            <div className="sc-lbl sc-rev">Built for India</div>
            <h2 className="sc-h2 sc-rev">Not adapted.<br /><em>Native.</em></h2>
            <p className="sc-body sc-rev">Every prompt, template, and form of address designed from the ground up for Indian courts and advocates.</p>
            <div className="sc-ipills">
              {['🏛️ "My Lord" for SC/HC · "Your Honour" for District','📖 IPC · CrPC · CPC · Evidence Act','🔗 Indian Kanoon citation verification','🏢 SC · HC · District · NCLT · Consumer Forum','💸 GST invoicing · Paise-accurate billing','📝 Vakalatnama · CNR number tracking','🗣️ Telugu · Hindi · English interface','📅 Indian court holiday calendar','⚖️ Bail templates under CrPC §437 / §439','🏗️ Companies Act 2013 · NCLT · IBC'].map((p,i)=>(
                <div key={i} className="sc-ipill sc-rev">{p}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sc-section" id="sc-pricing">
        <div className="sc-si">
          <div className="sc-lbl sc-rev">Pricing</div>
          <h2 className="sc-h2 sc-rev">Simple, transparent,<br /><em>practice-sized</em></h2>
          <div className="sc-pricing">
            <div className="sc-plan sc-rev">
              <div className="sc-pbadge">Solo</div><div className="sc-pname">Starter</div><div className="sc-pdesc">For individual advocates starting their digital practice.</div>
              <div className="sc-pprice"><span className="sc-pcur">₹</span><span className="sc-pamt">2,999</span><span className="sc-pper"> / month</span></div>
              <div className="sc-pfeats">{['2 team members','Unlimited cases & documents','50 AI agent runs / month','All 8 AI agents','Client portal (5 clients)','GST invoicing'].map((f,i)=><div key={i} className="sc-pf"><span className="sc-pchk">✓</span>{f}</div>)}</div>
              <a href="/login" className="sc-pbtn sc-bpo">Get started</a>
            </div>
            <div className="sc-plan sc-feat sc-rev">
              <div className="sc-pbadge">Most popular</div><div className="sc-pname">Professional</div><div className="sc-pdesc">For growing firms with multiple advocates.</div>
              <div className="sc-pprice"><span className="sc-pcur">₹</span><span className="sc-pamt">7,999</span><span className="sc-pper"> / month</span></div>
              <div className="sc-pfeats">{['10 team members','Unlimited cases & documents','250 AI agent runs / month','All agents + coming soon','Unlimited client portal','Custom permission roles','Audit log & CSV export','Priority support'].map((f,i)=><div key={i} className="sc-pf"><span className="sc-pchk">✓</span>{f}</div>)}</div>
              <a href="/login" className="sc-pbtn sc-bpn">Get started →</a>
            </div>
            <div className="sc-plan sc-rev">
              <div className="sc-pbadge">Enterprise</div><div className="sc-pname">Chambers</div><div className="sc-pdesc">For large firms, chambers, and legal departments.</div>
              <div className="sc-pprice"><span className="sc-pamt" style={{fontSize:'36px'}}>Custom</span></div>
              <div className="sc-pfeats">{['Unlimited team members','Unlimited AI agent runs','Dedicated account manager','Custom integrations','SLA & uptime guarantee','On-premise option'].map((f,i)=><div key={i} className="sc-pf"><span className="sc-pchk">✓</span>{f}</div>)}</div>
              <a href="mailto:hello@sovereigncounsel.in" className="sc-pbtn sc-bpo">Contact us</a>
            </div>
          </div>
        </div>
      </section>

      <div className="sc-cta">
        <div className="sc-ctabg"></div><div className="sc-ctaglow"></div>
        <div className="sc-ctai">
          <h2 className="sc-ctah2 sc-rev">Your practice.<br /><em>Reimagined.</em></h2>
          <p className="sc-ctasub sc-rev">Join advocates across Telangana, Andhra Pradesh, and Maharashtra already practising smarter.</p>
          <div className="sc-rev" style={{display:'flex',justifyContent:'center'}}>
            <a href="/login" className="sc-bmain" style={{fontSize:'17px',padding:'18px 44px'}}>Start your free trial <div className="sc-arr">→</div></a>
          </div>
        </div>
      </div>

      <footer className="sc-footer">
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}><div className="sc-flogo">SC</div><span className="sc-fname">Sovereign Counsel · LexAI India</span></div>
        <div className="sc-flinks"><a href="#sc-features">Platform</a><a href="#sc-agents">AI Agents</a><a href="#sc-pricing">Pricing</a><a href="/login">Log in →</a></div>
        <div className="sc-fcopy">© 2025 Sovereign Counsel. Built for Indian advocates.</div>
      </footer>

      <script dangerouslySetInnerHTML={{__html:`
(function(){
  var cur=document.getElementById('sc-cursor'),ring=document.getElementById('sc-ring');
  var mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px'});
  (function ar(){rx+=(mx-rx)*0.12;ry+=(my-ry)*0.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(ar)})();
  document.querySelectorAll('a,button,.sc-acard,.sc-b,.sc-ipill').forEach(function(el){
    el.addEventListener('mouseenter',function(){cur.style.transform='translate(-50%,-50%) scale(2.5)';ring.style.width='56px';ring.style.height='56px'});
    el.addEventListener('mouseleave',function(){cur.style.transform='translate(-50%,-50%) scale(1)';ring.style.width='36px';ring.style.height='36px'});
  });
  var c=document.getElementById('sc-canvas'),ctx=c.getContext('2d');
  function rsz(){c.width=window.innerWidth;c.height=window.innerHeight}rsz();window.addEventListener('resize',rsz);
  var N=[];for(var i=0;i<90;i++)N.push({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:Math.random()*1.5+.5,o:Math.random()*.5+.1});
  (function draw(){ctx.clearRect(0,0,c.width,c.height);for(var i=0;i<N.length;i++){var n=N[i];n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>c.width)n.vx*=-1;if(n.y<0||n.y>c.height)n.vy*=-1;for(var j=i+1;j<N.length;j++){var m=N[j],d=Math.hypot(n.x-m.x,n.y-m.y);if(d<130){ctx.beginPath();ctx.moveTo(n.x,n.y);ctx.lineTo(m.x,m.y);ctx.strokeStyle='rgba(255,224,136,'+(1-d/130)*.07+')';ctx.lineWidth=.5;ctx.stroke()}}ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fillStyle='rgba(255,224,136,'+n.o*.6+')';ctx.fill();}requestAnimationFrame(draw);})();
  window.addEventListener('scroll',function(){document.getElementById('sc-nav').classList.toggle('sc-scrolled',window.scrollY>40)});
  var obs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('sc-vis')})},{threshold:.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.sc-rev,.sc-revl,.sc-revr').forEach(function(el,i){el.style.transitionDelay=(i%8)*.07+'s';obs.observe(el)});
})();
      `}} />
    </div>
  );
}

const STYLES = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#022448;--navy-deep:#010f1f;--navy-mid:#04386e;--gold:#ffe088;--gold-warm:#ffd055;--gold-deep:#b8940a}
#sc-site{font-family:'Manrope',sans-serif;background:var(--navy-deep);color:#fff;overflow-x:hidden;cursor:none}
.sc-cursor{position:fixed;width:10px;height:10px;background:var(--gold);border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);transition:transform 0.1s,width 0.3s,height 0.3s;mix-blend-mode:difference}
.sc-ring{position:fixed;width:36px;height:36px;border:1.5px solid rgba(255,224,136,0.5);border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);transition:width 0.3s,height 0.3s}
.sc-nav{position:fixed;top:0;left:0;right:0;z-index:200;display:flex;align-items:center;justify-content:space-between;padding:0 52px;height:68px;transition:all 0.4s}
.sc-nav.sc-scrolled{background:rgba(1,15,31,0.95);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06)}
.sc-brand{display:flex;align-items:center;gap:12px;text-decoration:none}
.sc-logo-wrap{position:relative}
.sc-logo{width:36px;height:36px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Newsreader',serif;font-weight:600;color:var(--navy);font-size:17px;position:relative;z-index:1}
.sc-logo-glow{position:absolute;inset:-4px;background:var(--gold);border-radius:12px;opacity:0.2;filter:blur(8px);animation:scLG 3s ease-in-out infinite}
@keyframes scLG{0%,100%{opacity:0.15;transform:scale(1)}50%{opacity:0.35;transform:scale(1.1)}}
.sc-name{font-family:'Newsreader',serif;font-weight:500;font-size:17px;color:#fff;letter-spacing:-0.01em}
.sc-navlinks{display:flex;align-items:center;gap:36px}
.sc-navlinks a{font-size:13px;font-weight:500;color:rgba(255,255,255,0.6);text-decoration:none;transition:color 0.2s;position:relative}
.sc-navlinks a::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:1px;background:var(--gold);transform:scaleX(0);transition:transform 0.3s;transform-origin:left}
.sc-navlinks a:hover{color:#fff}
.sc-navlinks a:hover::after{transform:scaleX(1)}
.sc-cta{display:flex;align-items:center;gap:12px}
.sc-btn-g{font-family:'Manrope',sans-serif;font-size:13px;font-weight:600;color:rgba(255,255,255,0.8);background:none;border:1px solid rgba(255,255,255,0.2);padding:8px 20px;border-radius:8px;cursor:pointer;text-decoration:none;transition:all 0.25s}
.sc-btn-g:hover{border-color:rgba(255,255,255,0.6);color:#fff;background:rgba(255,255,255,0.06)}
.sc-btn-p{font-family:'Manrope',sans-serif;font-size:13px;font-weight:700;color:var(--navy);background:var(--gold);border:none;padding:9px 22px;border-radius:8px;cursor:pointer;text-decoration:none;transition:all 0.25s}
.sc-btn-p:hover{background:var(--gold-warm);transform:translateY(-1px);box-shadow:0 4px 20px rgba(255,224,136,0.35)}
.sc-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 48px 80px;position:relative;overflow:hidden}
#sc-canvas{position:absolute;inset:0;z-index:0}
.sc-hc{position:relative;z-index:2;text-align:center;max-width:900px}
.sc-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(255,224,136,0.25);background:rgba(255,224,136,0.06);padding:6px 16px;border-radius:30px;font-size:11px;font-weight:700;color:var(--gold);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:32px;animation:scFD 0.8s ease forwards}
@keyframes scFD{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
.sc-ep{width:6px;height:6px;background:var(--gold);border-radius:50%;animation:scEP 2s ease-in-out infinite}
@keyframes scEP{0%,100%{box-shadow:0 0 0 0 rgba(255,224,136,0.5)}70%{box-shadow:0 0 0 8px rgba(255,224,136,0)}}
.sc-h1{font-family:'Newsreader',serif;font-size:clamp(48px,7vw,88px);font-weight:400;line-height:1.0;letter-spacing:-0.025em;color:#fff;margin-bottom:28px;opacity:0;animation:scHF 1s 0.2s ease forwards}
@keyframes scHF{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
.sc-h1 .l2{display:block;color:var(--gold);font-style:italic}
.sc-h1 .l3{display:block;color:rgba(255,255,255,0.45);font-size:0.62em;font-style:normal;margin-top:10px;font-weight:300}
.sc-sub{font-size:18px;font-weight:400;color:rgba(255,255,255,0.6);line-height:1.75;max-width:580px;margin:0 auto 44px;opacity:0;animation:scHF 1s 0.4s ease forwards}
.sc-acts{display:flex;align-items:center;gap:16px;justify-content:center;flex-wrap:wrap;opacity:0;animation:scHF 1s 0.6s ease forwards}
.sc-bmain{font-family:'Manrope',sans-serif;font-size:16px;font-weight:700;color:var(--navy);background:var(--gold);border:none;padding:16px 36px;border-radius:12px;cursor:pointer;text-decoration:none;transition:all 0.3s;display:inline-flex;align-items:center;gap:10px}
.sc-bmain:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(255,224,136,0.4)}
.sc-arr{width:20px;height:20px;border-radius:50%;background:rgba(2,36,72,0.2);display:flex;align-items:center;justify-content:center;font-size:12px;transition:transform 0.3s}
.sc-bmain:hover .sc-arr{transform:translateX(4px)}
.sc-bgh{font-family:'Manrope',sans-serif;font-size:16px;font-weight:600;color:rgba(255,255,255,0.8);background:none;border:1.5px solid rgba(255,255,255,0.15);padding:16px 36px;border-radius:12px;cursor:pointer;text-decoration:none;transition:all 0.3s}
.sc-bgh:hover{border-color:rgba(255,255,255,0.5);color:#fff}
.sc-scroll{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;opacity:0;animation:scHF 1s 1.2s ease forwards;z-index:2}
.sc-sline{width:1px;height:48px;background:linear-gradient(to bottom,rgba(255,255,255,0.3),transparent);animation:scSL 2s ease-in-out infinite}
@keyframes scSL{0%{transform:scaleY(0);transform-origin:top}50%{transform:scaleY(1);transform-origin:top}51%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
.sc-stxt{font-size:10px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.3);text-transform:uppercase}
.sc-statsbar{position:absolute;bottom:0;left:0;right:0;display:flex;border-top:1px solid rgba(255,255,255,0.06);z-index:2;opacity:0;animation:scHF 1s 0.9s ease forwards}
.sc-stat{flex:1;padding:20px 32px;border-right:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:14px}
.sc-stat:last-child{border-right:none}
.sc-snum{font-family:'Newsreader',serif;font-size:28px;font-weight:400;color:var(--gold);line-height:1}
.sc-slbl{font-size:12px;font-weight:700;color:#fff}
.sc-ssub{font-size:11px;color:rgba(255,255,255,0.4)}
.sc-mq{overflow:hidden;border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.02)}
.sc-mtrack{display:flex;animation:scMQ 30s linear infinite;width:max-content}
.sc-mi{padding:16px 40px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.35);letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;border-right:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:10px}
.sc-md{width:4px;height:4px;background:var(--gold);border-radius:50%;opacity:0.6}
@keyframes scMQ{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.sc-section{padding:120px 52px}
.sc-si{max-width:1140px;margin:0 auto}
.sc-lbl{font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:flex;align-items:center;gap:10px}
.sc-lbl::before{content:'';width:24px;height:1px;background:var(--gold);opacity:0.6}
.sc-h2{font-family:'Newsreader',serif;font-weight:400;font-size:clamp(36px,4.5vw,60px);color:#fff;line-height:1.05;letter-spacing:-0.02em}
.sc-h2 em{font-style:italic;color:var(--gold)}
.sc-body{font-size:18px;color:rgba(255,255,255,0.55);line-height:1.7;max-width:520px;margin-top:18px}
.sc-bento{display:grid;grid-template-columns:repeat(12,1fr);gap:16px;margin-top:72px}
.sc-b{border-radius:20px;padding:32px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);overflow:hidden;transition:border-color 0.3s,background 0.3s}
.sc-b:hover{border-color:rgba(255,255,255,0.15);background:rgba(255,255,255,0.05)}
.sc-b1{grid-column:span 5}.sc-b2{grid-column:span 7}.sc-b3{grid-column:span 4}.sc-b4{grid-column:span 4}.sc-b5{grid-column:span 4}.sc-b6{grid-column:span 8}.sc-b7{grid-column:span 4}
.sc-btag{display:inline-flex;align-items:center;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:4px 10px;border-radius:4px;margin-bottom:16px}
.sc-tlive{background:rgba(74,222,128,0.12);color:#4ade80;border:1px solid rgba(74,222,128,0.2)}
.sc-tnew{background:rgba(255,224,136,0.12);color:var(--gold);border:1px solid rgba(255,224,136,0.2)}
.sc-bico{font-size:32px;margin-bottom:20px;display:block}
.sc-btitle{font-family:'Newsreader',serif;font-size:22px;font-weight:500;color:#fff;margin-bottom:10px;line-height:1.2}
.sc-bdesc{font-size:14px;color:rgba(255,255,255,0.5);line-height:1.65}
.sc-agents{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:64px}
.sc-acard{border-radius:16px;padding:24px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);transition:all 0.3s;position:relative;overflow:hidden}
.sc-acard::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(255,224,136,0.6),transparent);transform:scaleX(0);transition:transform 0.4s;transform-origin:left}
.sc-acard:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,224,136,0.2);transform:translateY(-4px)}
.sc-acard:hover::before{transform:scaleX(1)}
.sc-anum{font-size:10px;font-weight:800;color:rgba(255,224,136,0.35);letter-spacing:0.1em;margin-bottom:14px}
.sc-aemoji{font-size:26px;margin-bottom:12px;display:block}
.sc-aname{font-size:14px;font-weight:700;color:#fff;margin-bottom:6px}
.sc-adesc{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.55}
.sc-acard.sc-dim{opacity:0.4}
.sc-adim{font-size:9px;font-weight:700;color:rgba(255,255,255,0.25);margin-top:10px;letter-spacing:0.06em;text-transform:uppercase}
.sc-ipills{display:flex;flex-wrap:wrap;gap:10px;margin-top:48px}
.sc-ipill{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:30px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);font-size:13px;font-weight:500;color:rgba(255,255,255,0.75);transition:all 0.3s}
.sc-ipill:hover{border-color:rgba(255,224,136,0.3);background:rgba(255,224,136,0.05);color:#fff}
.sc-pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:72px;max-width:960px;margin-left:auto;margin-right:auto}
.sc-plan{border-radius:24px;padding:40px 32px;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);transition:transform 0.3s}
.sc-plan:hover{transform:translateY(-6px)}
.sc-plan.sc-feat{background:var(--gold);border-color:var(--gold)}
.sc-pbadge{font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:24px;display:inline-block;padding:5px 12px;border-radius:4px}
.sc-plan:not(.sc-feat) .sc-pbadge{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5)}
.sc-plan.sc-feat .sc-pbadge{background:rgba(2,36,72,0.15);color:var(--navy)}
.sc-pname{font-family:'Newsreader',serif;font-size:26px;font-weight:400;color:#fff;margin-bottom:8px}
.sc-plan.sc-feat .sc-pname{color:var(--navy)}
.sc-pdesc{font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:28px;line-height:1.5}
.sc-plan.sc-feat .sc-pdesc{color:rgba(2,36,72,0.6)}
.sc-pprice{display:flex;align-items:baseline;gap:4px;margin-bottom:32px}
.sc-pcur{font-size:20px;font-weight:600;color:#fff}
.sc-plan.sc-feat .sc-pcur{color:var(--navy)}
.sc-pamt{font-family:'Newsreader',serif;font-size:52px;font-weight:400;color:#fff;line-height:1}
.sc-plan.sc-feat .sc-pamt{color:var(--navy)}
.sc-pper{font-size:13px;color:rgba(255,255,255,0.4)}
.sc-plan.sc-feat .sc-pper{color:rgba(2,36,72,0.5)}
.sc-pfeats{flex:1;display:flex;flex-direction:column;gap:12px;margin-bottom:32px}
.sc-pf{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.4}
.sc-plan.sc-feat .sc-pf{color:rgba(2,36,72,0.75)}
.sc-pchk{font-size:12px;color:var(--gold);flex-shrink:0;margin-top:1px;font-weight:700}
.sc-plan.sc-feat .sc-pchk{color:var(--navy)}
.sc-pbtn{width:100%;padding:14px;border-radius:12px;font-family:'Manrope',sans-serif;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;display:block;transition:all 0.25s}
.sc-bpo{background:none;border:1.5px solid rgba(255,255,255,0.2);color:#fff}
.sc-bpo:hover{border-color:#fff;background:rgba(255,255,255,0.07)}
.sc-bpn{background:var(--navy);border:none;color:var(--gold)}
.sc-bpn:hover{background:#04386e}
.sc-cta{position:relative;overflow:hidden;padding:160px 52px;text-align:center}
.sc-ctabg{position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 50%,rgba(2,36,72,0.9),transparent)}
.sc-ctaglow{position:absolute;width:600px;height:600px;left:50%;top:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,224,136,0.07),transparent 70%);pointer-events:none}
.sc-ctai{position:relative;z-index:1}
.sc-ctah2{font-family:'Newsreader',serif;font-size:clamp(40px,5vw,72px);font-weight:400;color:#fff;line-height:1.05;letter-spacing:-0.02em;margin-bottom:20px}
.sc-ctah2 em{color:var(--gold);font-style:italic}
.sc-ctasub{font-size:18px;color:rgba(255,255,255,0.5);margin-bottom:44px;max-width:480px;margin-left:auto;margin-right:auto}
.sc-footer{background:rgba(0,0,0,0.4);border-top:1px solid rgba(255,255,255,0.06);padding:48px 52px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px}
.sc-flogo{width:28px;height:28px;background:var(--gold);border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Newsreader',serif;font-weight:600;color:var(--navy);font-size:13px}
.sc-fname{font-family:'Newsreader',serif;font-size:15px;font-weight:500;color:rgba(255,255,255,0.5)}
.sc-flinks{display:flex;gap:28px;flex-wrap:wrap}
.sc-flinks a{font-size:12px;color:rgba(255,255,255,0.3);text-decoration:none;transition:color 0.2s}
.sc-flinks a:hover{color:rgba(255,255,255,0.7)}
.sc-fcopy{font-size:11px;color:rgba(255,255,255,0.2)}
.sc-rev{opacity:0;transform:translateY(32px);transition:opacity 0.7s ease,transform 0.7s ease}
.sc-rev.sc-vis{opacity:1;transform:translateY(0)}
@media(max-width:960px){
  .sc-nav{padding:0 20px}.sc-navlinks{display:none}
  .sc-section{padding:80px 20px}.sc-hero{padding:100px 20px 60px}
  .sc-statsbar{display:none}
  .sc-bento{grid-template-columns:1fr 1fr}
  .sc-b1,.sc-b2,.sc-b3,.sc-b4,.sc-b5,.sc-b6,.sc-b7{grid-column:span 1}
  .sc-agents{grid-template-columns:repeat(2,1fr)}
  .sc-pricing{grid-template-columns:1fr;max-width:420px}
  .sc-footer{flex-direction:column;text-align:center}.sc-flinks{justify-content:center}
}
`;
