/* Taller Eléctrico · Nube (Supabase)
   Alumno: código de curso + nombre + PIN → su avance se guarda solo en la nube.
   Profe: correo + clave → crea cursos, ve notas en vivo, resetea PIN. */
(function(){
"use strict";
const SB_URL="https://qzitrvwmyeeowefroryv.supabase.co";
const SB_KEY="sb_publishable_bGSLRWpm-HhAMcgldF4HFA_xzeFoDsM";
const NK="taller-nube";
const T=()=>window.TALLER_API;
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toast=m=>{try{T().toast(m);}catch(e){alert(m);}};
let N=(()=>{try{return JSON.parse(localStorage.getItem(NK))||null;}catch(e){return null;}})();
const saveN=()=>{try{N?localStorage.setItem(NK,JSON.stringify(N)):localStorage.removeItem(NK);}catch(e){}};

/* ---------- llamadas sin librería (alumno) ---------- */
async function rpc(fn,args,keep){
  const r=await fetch(SB_URL+"/rest/v1/rpc/"+fn,{method:"POST",keepalive:!!keep,
    headers:{apikey:SB_KEY,"Content-Type":"application/json"},body:JSON.stringify(args)});
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null;}catch(e){}
  if(!r.ok)throw new Error((j&&j.message)||("Error "+r.status));
  return j;
}

/* ---------- estilos ---------- */
const css=document.createElement("style");
css.textContent=`
.nb-chip{position:fixed;bottom:calc(84px + env(safe-area-inset-bottom,0px));right:12px;z-index:60;display:flex;align-items:center;gap:8px;
 padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-family:inherit;font-size:14px;font-weight:600;
 box-shadow:0 2px 10px rgba(0,0,0,.12);cursor:pointer;max-width:70vw}
.nb-chip b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nb-dot{width:9px;height:9px;border-radius:50%;background:#9AA3AD;flex:none}
.nb-dot.on{background:#1F9D55}.nb-dot.err{background:#D64545}
.nb-ov{position:fixed;inset:0;z-index:70;background:rgba(10,15,20,.55);display:flex;align-items:center;justify-content:center;padding:16px}
.nb-box{background:var(--surface);color:var(--ink);border-radius:18px;padding:22px;width:min(420px,100%);box-shadow:0 10px 40px rgba(0,0,0,.3)}
.nb-box h2{margin:0 0 6px;font-size:22px}.nb-box p{margin:0 0 12px;color:var(--muted);font-size:15px}
.nb-f{display:flex;flex-direction:column;gap:4px;margin-bottom:12px;font-size:14px;font-weight:600}
.nb-f input{font:inherit;font-size:18px;font-weight:500;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--sunk);color:var(--ink)}
.nb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.nb-b{font-family:inherit;font-size:16px;font-weight:700;padding:11px 16px;border-radius:12px;border:1px solid var(--line);background:var(--sunk);color:var(--ink);cursor:pointer}
.nb-b.p{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.nb-b:disabled{opacity:.6;cursor:default}
.nb-err{color:#D64545;font-weight:600;font-size:14px;min-height:18px;margin:0 0 8px}
.nb-code{font:800 26px/1 ui-monospace,monospace;letter-spacing:3px;background:var(--accent-soft);padding:6px 12px;border-radius:10px;display:inline-block}
.nb-cur{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px}
.nb-cur h3{margin:0 0 6px;font-size:17px}
.nb-al{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-top:1px dashed var(--line);font-size:15px}
.nb-al small{color:var(--muted)}
.nb-link{background:none;border:0;color:var(--ink);text-decoration:underline;cursor:pointer;font:inherit;font-size:14px;padding:0}
`;
document.head.appendChild(css);

/* ---------- chip del alumno ---------- */
const chip=document.createElement("button");chip.className="nb-chip";chip.type="button";
document.body.appendChild(chip);
let estado="";// "", "on", "err"
function chipUI(){
  chip.innerHTML='<span class="nb-dot '+estado+'"></span><b>'+(N?esc(N.nombre)+" · nube":"Entrar a mi curso")+'</b>';
  chip.setAttribute("aria-label",N?"Conectado a la nube como "+N.nombre:"Entrar a mi curso para guardar en la nube");
}
chipUI();
chip.addEventListener("click",()=>N?modalCuenta():modalEntrar());

function modal(html){
  const o=document.createElement("div");o.className="nb-ov";o.innerHTML='<div class="nb-box" role="dialog" aria-modal="true">'+html+'</div>';
  o.addEventListener("click",e=>{if(e.target===o||e.target.closest("[data-nb-x]"))o.remove();});
  document.body.appendChild(o);const f=o.querySelector("input");if(f)f.focus();return o;
}
function modalEntrar(){
  const o=modal('<h2>Entrar a mi curso</h2><p>Tu avance se guardará en la nube y tu profe lo verá en vivo.</p>'
    +'<label class="nb-f">Código del curso<input id="nb-c" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="Ej: A1B2C3"></label>'
    +'<label class="nb-f">Nombre y apellido<input id="nb-n" maxlength="40" autocomplete="off" placeholder="Ej: Ana Pérez"></label>'
    +'<label class="nb-f">PIN (4 números)<input id="nb-p" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••"></label>'
    +'<p class="nb-err" id="nb-e" role="alert"></p>'
    +'<p style="font-size:13px">¿Primera vez? El PIN que escribas queda como tu clave. No lo compartas.</p>'
    +'<div class="nb-row"><button class="nb-b p" id="nb-go">Entrar</button><button class="nb-b" data-nb-x>Cancelar</button></div>');
  const go=o.querySelector("#nb-go"),err=o.querySelector("#nb-e");
  const enviar=async()=>{
    const c=o.querySelector("#nb-c").value.trim().toUpperCase(),n=o.querySelector("#nb-n").value.replace(/\s+/g," ").trim(),p=o.querySelector("#nb-p").value.trim();
    if(c.length!==6){err.textContent="El código del curso tiene 6 caracteres.";return;}
    if(n.length<3){err.textContent="Escribe tu nombre y apellido.";return;}
    if(!/^\d{4}$/.test(p)){err.textContent="El PIN son 4 números.";return;}
    go.disabled=true;go.textContent="Entrando…";err.textContent="";
    try{
      const token=await rpc("alumno_entrar",{p_codigo:c,p_nombre:n,p_pin:p});
      const nube=await rpc("alumno_cargar",{p_token:token});
      N={token,nombre:n,curso:c,last:""};saveN();
      const remoto=nube&&nube.snap&&nube.snap.snap;
      if(remoto&&Object.keys(remoto).length){
        T().restore(remoto);N.last=JSON.stringify(remoto);saveN();
        o.remove();recargar("¡Hola "+n.split(" ")[0]+"! Cargamos tu avance desde la nube.");return;
      }
      await subir(true);o.remove();estado="on";chipUI();toast("¡Listo, "+n.split(" ")[0]+"! Tu avance se guardará solo.");
    }catch(e){err.textContent=e.message;go.disabled=false;go.textContent="Entrar";}
  };
  go.addEventListener("click",enviar);
  o.addEventListener("keydown",e=>{if(e.key==="Enter")enviar();});
}
function modalCuenta(){
  const o=modal('<h2>'+esc(N.nombre)+'</h2><p>Curso <b>'+esc(N.curso)+'</b>. Tu avance se guarda solo en la nube'+(N.hora?' (último: '+esc(N.hora)+')':'')+'.</p>'
    +'<p class="nb-err" id="nb-e" role="alert"></p>'
    +'<div class="nb-row"><button class="nb-b p" id="nb-s">Guardar ahora</button><button class="nb-b" id="nb-out">Salir</button><button class="nb-b" data-nb-x>Cerrar</button></div>'
    +'<p style="font-size:13px;margin-top:12px">Si el computador es compartido, pulsa <b>Salir</b> al terminar: se guarda y se limpia el equipo para el siguiente.</p>');
  o.querySelector("#nb-s").addEventListener("click",async()=>{try{await subir(true);o.remove();toast("Guardado en la nube ✔");}catch(e){o.querySelector("#nb-e").textContent=e.message;}});
  o.querySelector("#nb-out").addEventListener("click",async ev=>{
    ev.target.disabled=true;ev.target.textContent="Guardando…";
    try{await subir(true);}catch(e){if(!confirm("No se pudo guardar ("+e.message+"). ¿Salir igual? Se perderá lo no guardado."))return;}
    N=null;saveN();T().restore({});o.remove();recargar("Sesión cerrada. El equipo quedó listo para otro alumno.");
  });
}
function recargar(msg){try{sessionStorage.setItem("taller-hola",msg);}catch(e){}location.reload();}

/* ---------- guardado automático ---------- */
async function subir(forzar,keep){
  if(!N)return;
  const s=T().snap(),js=JSON.stringify(s);
  if(!forzar&&js===N.last)return;
  let st="";try{st=T().starStr();}catch(e){}
  await rpc("alumno_guardar",{p_token:N.token,p_mundo:"snap",p_datos:{snap:s,st,nombre:N.nombre,fecha:T().today()}},keep);
  N.last=js;N.hora=new Date().toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"});saveN();estado="on";chipUI();
}
async function tick(){if(!N)return;try{await subir(false);}catch(e){estado="err";chipUI();if(/Sesión no válida/.test(e.message)){N=null;saveN();chipUI();toast("Tu sesión expiró. Vuelve a entrar a tu curso.");}}}
if(N){estado="on";chipUI();}
setInterval(tick,20000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")subir(false,true).catch(()=>{});});
window.addEventListener("pagehide",()=>{subir(false,true).catch(()=>{});});

/* ---------- PROFE ---------- */
let sb=null,sesion=null,cursos=null,abiertos={},cargando=false,msgP="";
function lib(){return new Promise((ok,no)=>{if(window.supabase)return ok();const s=document.createElement("script");
  s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";s.onload=ok;s.onerror=()=>no(new Error("Sin conexión"));document.head.appendChild(s);});}
async function cliente(){if(sb)return sb;await lib();sb=window.supabase.createClient(SB_URL,SB_KEY);
  const {data}=await sb.auth.getSession();sesion=data.session;
  sb.auth.onAuthStateChange((_e,s)=>{sesion=s;if(!s)cursos=null;pintar();});return sb;}

async function cargarCursos(){
  cargando=true;pintar();
  try{
    const {data:cs,error}=await sb.from("cursos").select("id,nombre,liceo,codigo,alumnos(id,nombre,creado)").order("creado");
    if(error)throw error;
    const {data:av,error:e2}=await sb.from("avance").select("alumno_id,datos,actualizado").eq("mundo","snap");
    if(e2)throw e2;
    const porAl={};(av||[]).forEach(a=>porAl[a.alumno_id]=a);
    cursos=(cs||[]).map(c=>Object.assign(c,{alumnos:(c.alumnos||[]).sort((a,b)=>a.nombre.localeCompare(b.nombre,"es")).map(a=>Object.assign(a,{av:porAl[a.id]||null}))}));
    msgP="";
  }catch(e){msgP=e.message;}
  cargando=false;pintar();
}
function aNotas(){
  const api=T(),P=api.P();let n=0;
  cursos.forEach(c=>c.alumnos.forEach(a=>{if(!a.av||!a.av.datos||!a.av.datos.st)return;
    const key=api.nkey(a.nombre)+"|"+api.ckey(c.nombre),d=a.av.datos,f=new Date(a.av.actualizado);
    const fecha=String(f.getDate()).padStart(2,"0")+"/"+String(f.getMonth()+1).padStart(2,"0");
    const r=P.rows[key];P.rows[key]={nombre:a.nombre,curso:c.nombre,st:d.st,fecha,codes:r&&r.codes?r.codes:[]};n++;}));
  api.saveP();return n;
}
const hace=t=>{if(!t)return"sin avance aún";const m=Math.round((Date.now()-new Date(t))/60000);
  return m<1?"activo ahora":m<60?"hace "+m+" min":m<1440?"hace "+Math.round(m/60)+" h":"hace "+Math.round(m/1440)+" días";};

function htmlProfe(){
  let h='<div class="panel" id="nb-panel"><h2>☁️ Mis cursos en la nube</h2>';
  if(!sb||sesion===undefined){return h+'<p class="muted">Conectando…</p></div>';}
  if(!sesion){
    return h+'<p class="muted" style="margin-bottom:10px">Entra con tu correo para crear cursos y ver las notas de tus alumnos <b>en vivo</b>, sin pegar códigos.</p>'
      +'<label class="nb-f">Correo<input id="nbp-m" type="email" autocomplete="username"></label>'
      +'<label class="nb-f">Clave (mínimo 6)<input id="nbp-k" type="password" autocomplete="current-password"></label>'
      +'<p class="nb-err" role="alert">'+esc(msgP)+'</p>'
      +'<div class="nb-row"><button class="nb-b p" data-nbp="in">Entrar</button><button class="nb-b" data-nbp="up">Crear cuenta de profe</button></div></div>';
  }
  h+='<p class="muted" style="margin-bottom:10px">Conectado como <b>'+esc(sesion.user.email)+'</b> · <button class="nb-link" data-nbp="out">Cerrar sesión</button></p>';
  if(msgP)h+='<p class="nb-err" role="alert">'+esc(msgP)+'</p>';
  if(cargando&&!cursos)return h+'<p class="muted">Cargando cursos…</p></div>';
  if(cursos&&cursos.length){
    cursos.forEach(c=>{
      const act=c.alumnos.filter(a=>a.av).length;
      h+='<div class="nb-cur"><h3>'+esc(c.nombre)+(c.liceo?' <small class="muted">· '+esc(c.liceo)+'</small>':'')+'</h3>'
        +'<p style="margin:0 0 8px">Código para los alumnos: <span class="nb-code">'+esc(c.codigo)+'</span></p>'
        +'<p class="muted" style="margin:0 0 6px">'+c.alumnos.length+' alumnos · '+act+' con avance · <button class="nb-link" data-nbp="ver" data-id="'+c.id+'">'+(abiertos[c.id]?"Ocultar":"Ver")+' alumnos</button></p>';
      if(abiertos[c.id])h+=c.alumnos.length?c.alumnos.map(a=>'<div class="nb-al"><span>'+esc(a.nombre)+' <small>· '+hace(a.av&&a.av.actualizado)+'</small></span><button class="nb-link" data-nbp="pin" data-id="'+a.id+'" data-n="'+esc(a.nombre)+'">Nuevo PIN</button></div>').join(""):'<p class="muted">Aún no entra nadie. Dales el código.</p>';
      h+='</div>';
    });
    h+='<div class="nb-row" style="margin-bottom:14px"><button class="nb-b p" data-nbp="notas">'+(cargando?"Actualizando…":"Traer notas de la nube")+'</button><button class="nb-b" data-nbp="rel">Actualizar</button></div>';
  }else if(cursos)h+='<p class="muted">Aún no tienes cursos. Crea el primero:</p>';
  h+='<details'+(cursos&&!cursos.length?" open":"")+'><summary style="cursor:pointer;font-weight:700">+ Nuevo curso</summary><div style="margin-top:10px">'
    +'<label class="nb-f">Nombre del curso<input id="nbp-cn" maxlength="30" placeholder="Ej: 3°A Electricidad"></label>'
    +'<label class="nb-f">Liceo (opcional)<input id="nbp-cl" maxlength="60"></label>'
    +'<button class="nb-b p" data-nbp="crear">Crear curso</button></div></details></div>';
  return h;
}
function pintar(){
  const root=document.getElementById("profe");if(!root||!root.querySelector("#pf-paste"))return;
  const old=document.getElementById("nb-panel"),tmp=document.createElement("div");tmp.innerHTML=htmlProfe();
  const nuevo=tmp.firstElementChild;
  if(old){const m=old.querySelector("#nbp-m"),k=old.querySelector("#nbp-k");old.replaceWith(nuevo);
    if(m&&nuevo.querySelector("#nbp-m")){nuevo.querySelector("#nbp-m").value=m.value;}}
  else{const tabs=root.querySelector(".ptabs");(tabs?tabs:root.firstElementChild).insertAdjacentElement("afterend",nuevo);}
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-nbp]");if(!b)return;const a=b.dataset.nbp;msgP="";
  try{
    if(a==="in"||a==="up"){
      const m=document.getElementById("nbp-m").value.trim(),k=document.getElementById("nbp-k").value;
      if(!m||k.length<6){msgP="Escribe tu correo y una clave de al menos 6 caracteres.";pintar();return;}
      b.disabled=true;
      if(a==="in"){const {error}=await sb.auth.signInWithPassword({email:m,password:k});if(error)throw error;await cargarCursos();}
      else{const {data,error}=await sb.auth.signUp({email:m,password:k,options:{emailRedirectTo:location.origin}});if(error)throw error;
        if(!data.session){msgP="Te enviamos un correo para confirmar la cuenta. Ábrelo y luego entra aquí.";pintar();}else await cargarCursos();}
    }else if(a==="out"){await sb.auth.signOut();}
    else if(a==="rel"){await cargarCursos();}
    else if(a==="ver"){abiertos[b.dataset.id]=!abiertos[b.dataset.id];pintar();}
    else if(a==="crear"){
      const n=document.getElementById("nbp-cn").value.trim(),l=document.getElementById("nbp-cl").value.trim();
      if(n.length<2){msgP="Escribe el nombre del curso.";pintar();return;}
      const {error}=await sb.from("cursos").insert({nombre:n,liceo:l||null});if(error)throw error;
      await cargarCursos();toast("Curso creado. Comparte el código con tus alumnos.");
    }else if(a==="pin"){
      const p=prompt("Nuevo PIN de 4 números para "+b.dataset.n+":");if(p==null)return;
      if(!/^\d{4}$/.test(p.trim())){toast("El PIN son 4 números.");return;}
      const {error}=await sb.rpc("profe_reset_pin",{p_alumno:b.dataset.id,p_pin:p.trim()});if(error)throw error;
      toast("PIN cambiado. Díselo a "+b.dataset.n+".");
    }else if(a==="notas"){
      await cargarCursos();const n=aNotas();T().profe();toast(n?"Notas actualizadas: "+n+" alumnos desde la nube.":"Aún no hay avance de alumnos en la nube.");
    }
  }catch(err){msgP=/Invalid login/.test(err.message)?"Correo o clave incorrectos.":/Email not confirmed/.test(err.message)?"Falta confirmar tu correo (revisa tu bandeja).":err.message;b.disabled=false;pintar();}
});
/* cuando se abre el panel del profe, aparece la sección nube */
new MutationObserver(()=>{const r=document.getElementById("profe");
  if(r&&r.querySelector("#pf-paste")&&!document.getElementById("nb-panel")){
    pintar();if(!sb)cliente().then(()=>{if(sesion&&!cursos)cargarCursos();else pintar();}).catch(e=>{msgP=e.message;pintar();});
    else if(sesion&&!cursos&&!cargando)cargarCursos();}
}).observe(document.body,{childList:true,subtree:true});
})();
