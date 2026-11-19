var AppV2 = (() => {
  const R = React;
  const h = R.createElement;
  const HISTORY = "workout_history";
  const DRAFT = "workout_active_draft_v2";
  const DAY = "workout_activeDay";
  const COLORS = { bg: "#0a0a0f", panel: "#111827", line: "#273244", text: "#f3f4f6", muted: "#9ca3af", green: "#10b981", blue: "#3b82f6" };
  const localDate = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const stableId = (name) => name.toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/^lying-leg-curl$|^leg-curl$/, "leg-curl");
  const correctedImage = (id, fallback) => {
    const art = {
      "barbell-bench-press": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f4f6f8"/><path d="M105 274h430M170 255h295" stroke="#64748b" stroke-width="14" stroke-linecap="round"/><circle cx="222" cy="205" r="29" fill="#2563eb"/><path d="M244 215l110 24 75-8M280 232l-32 42m105-34 30 37" fill="none" stroke="#2563eb" stroke-width="24" stroke-linecap="round"/><path d="M258 144h180m-8-18v38m-158-38v38" stroke="#111827" stroke-width="12" stroke-linecap="round"/><text x="24" y="42" font-family="Arial" font-size="20" fill="#334155">FLAT BARBELL BENCH PRESS</text></svg>',
      "plank": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f4f6f8"/><path d="M70 282h500" stroke="#94a3b8" stroke-width="8"/><circle cx="185" cy="178" r="29" fill="#2563eb"/><path d="M210 190l140 35 128 12m-266-32-34 70m62-62-60 65m264-44 86 46m-51-51 98 52" fill="none" stroke="#2563eb" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><text x="24" y="42" font-family="Arial" font-size="20" fill="#334155">FOREARM PLANK</text></svg>',
      "calf-raises": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f4f6f8"/><path d="M110 290h420" stroke="#94a3b8" stroke-width="10"/><path d="M302 100v104l-28 46 8 34m62-184v104l26 46-8 34" fill="none" stroke="#2563eb" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/><path d="M300 108l-18-35m80 35 18-35" stroke="#2563eb" stroke-width="20" stroke-linecap="round"/><path d="M260 286h140v-20H260z" fill="#64748b"/><path d="M270 264v-28m120 28v-28" stroke="#64748b" stroke-width="8"/><text x="24" y="42" font-family="Arial" font-size="20" fill="#334155">CALF RAISE · FULL RANGE</text></svg>'
    };
    return art[id] ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(art[id])}` : fallback;
  };
  const parseHistory = (v) => Array.isArray(v) && v.every(x => x && typeof x === "object" && /^\d{4}-\d\d-\d\d$/.test(x.date) && typeof x.day === "string" && typeof x.label === "string" && Number.isFinite(x.done) && Number.isFinite(x.total));
  const getHistory = () => { try { const x = JSON.parse(localStorage.getItem(HISTORY) || "[]"); return Array.isArray(x) ? x : []; } catch { return []; } };
  const getDraft = () => { try { const x = JSON.parse(localStorage.getItem(DRAFT) || "null"); return x && typeof x === "object" ? x : null; } catch { return null; } };
  const json = (x) => JSON.stringify(x);
  function App() {
    const program = window.__workoutProgram || {};
    const days = Object.keys(program);
    const [active, setActive] = R.useState(() => { try { const d=localStorage.getItem(DAY); return program[d] ? d : (days[0] || "day1"); } catch { return days[0] || "day1"; } });
    const [history, setHistory] = R.useState(getHistory);
    const [draft, setDraftState] = R.useState(getDraft);
    const [error, setError] = R.useState("");
    const [zoom, setZoom] = R.useState(null);
    const [chartId, setChartId] = R.useState(null);
    const [showHistory, setShowHistory] = R.useState(false);
    const [notice, setNotice] = R.useState("");
    const workout = program[active];
    const exercises = workout?.exercises || [];
    const ids = exercises.map(x => stableId(x.name));
    const done = draft?.day === active ? (draft.done || {}) : {};
    const remaining = (d) => Object.values(d.done || {}).some(Boolean);
    const persist = (nextDraft, nextHistory=history) => {
      try {
        if (nextHistory !== history) localStorage.setItem(HISTORY, json(nextHistory));
        if (nextDraft) localStorage.setItem(DRAFT, json(nextDraft)); else localStorage.removeItem(DRAFT);
        setHistory(nextHistory); setDraftState(nextDraft); setError(""); return true;
      } catch (e) { setError("Could not save to this device. Export a backup before continuing."); return false; }
    };
    const finalize = (d) => {
      if (!d) return true;
      if (!remaining(d)) return persist(null);
      const count = Object.values(d.done || {}).filter(Boolean).length;
      const record = { date: d.firstDate, day: d.day, label: program[d.day]?.name || d.label || d.day, done: count, total: d.total || program[d.day]?.exercises?.length || count };
      const sets = Object.fromEntries(Object.entries(d.sets || {}).filter(([,arr]) => arr?.some(s => s.kg !== "" || s.reps !== "")).map(([id,arr]) => [id, arr.map(s => ({kg:s.kg, reps:s.reps, timestamp:s.timestamp}))]));
      if (Object.keys(sets).length) record.sets = sets;
      if (d.activityLog?.length) record.activityLog = d.activityLog;
      return persist(null, [record, ...history]);
    };
    const isStale = (d, now, day, includeDay=true) => d && (now - d.lastActivity >= 4*60*60*1000 || localDate(now) !== localDate(d.lastActivity) || (includeDay && d.day !== day));
    const ensureCurrent = (day, now=Date.now()) => {
      let current = getDraft();
      if (isStale(current, now, day)) { if (!finalize(current)) return null; current = null; }
      if (!current) {
        const date = localDate(now);
        current = { version: 2, day, label: program[day]?.name || day, firstTick: null, firstDate: date, lastActivity: now, total: program[day]?.exercises?.length || 0, done: {}, sets: {} };
      }
      return current;
    };
    const activity = (mutate, day=active, isTick=false) => {
      const now = Date.now(); const d = ensureCurrent(day, now);
      if (!d) return;
      if (isTick && !d.firstTick) { d.firstTick = new Date(now).toISOString(); d.firstDate = localDate(now); }
      d.lastActivity = now; d.lastEntryTimestamp = new Date(now).toISOString(); d.firstDate = d.firstDate || localDate(now);
      d.activityLog = [...(d.activityLog || []), {timestamp:new Date(now).toISOString(), type:isTick?"tick":"set", day, ...(isTick?{}:{})}];
      mutate(d, now); persist(d);
    };
    const toggle = (id) => activity(d => { const checked=!d.done[id]; d.done = { ...d.done, [id]: checked }; d.tickTimestamps = { ...d.tickTimestamps, [id]: new Date().toISOString() }; d.activityLog[d.activityLog.length-1] = {...d.activityLog[d.activityLog.length-1], exerciseId:id, checked}; },active,true);
    const setValue = (id, index, field, value) => activity(d => {
      const a = [...(d.sets?.[id] || [])];
      while (a.length <= index) a.push({kg:"", reps:"", timestamp:null});
      a[index] = { ...a[index], [field]: value, timestamp: new Date().toISOString() };
      d.sets = { ...(d.sets || {}), [id]: a };
      d.activityLog[d.activityLog.length-1] = {...d.activityLog[d.activityLog.length-1], exerciseId:id, set:index+1, field, value};
    });
    const switchDay = (day) => { setActive(day); try { localStorage.setItem(DAY, day); } catch { setError("Could not save your selected workout day."); } };
    const touchDraft = (day) => {
      const d=getDraft(); if (isStale(d, Date.now(), day, false)) finalize(d);
    };
    R.useEffect(() => {
      const onReturn = () => { if (document.visibilityState === "visible") touchDraft(active); };
      window.addEventListener("pageshow", onReturn); document.addEventListener("visibilitychange", onReturn);
      return () => { window.removeEventListener("pageshow", onReturn); document.removeEventListener("visibilitychange", onReturn); };
    }, [active, history, draft]);
    R.useEffect(() => { try { localStorage.setItem(DAY, active); } catch {} }, [active]);
    const exportData = () => {
      const blob = new Blob([json({version:2, workout_history:getHistory(), workout_draft:getDraft()})], {type:"application/json"});
      const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`gym-backup-${localDate(Date.now())}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
    const importData = (ev) => {
      const file=ev.target.files?.[0]; if (!file) return; const reader=new FileReader();
      reader.onload=() => { try {
        const data=JSON.parse(reader.result); const rows=Array.isArray(data) ? data : data.workout_history;
        if (!parseHistory(rows)) throw new Error("Invalid history format");
        if (!window.confirm(`Add ${rows.length} backup sessions to the current history? Existing entries and drafts will be kept.`)) return;
        const next=[...getHistory(), ...rows]; if (!persist(getDraft(), next)) throw new Error("Save failed"); setNotice(`Imported ${rows.length} sessions.`);
      } catch { setError("Backup was not imported. The file format is invalid or storage is unavailable."); } finally { ev.target.value=""; } };
      reader.onerror=()=>setError("Could not read the selected backup file."); reader.readAsText(file);
    };
    const card = (title, content) => h("section", {style:{background:COLORS.panel,border:`1px solid ${COLORS.line}`,borderRadius:16,padding:16,marginBottom:12}}, h("div",{style:{fontWeight:750,marginBottom:10}},title),content);
    const buttonStyle={border:`1px solid ${COLORS.line}`,background:"#151e2c",color:COLORS.text,borderRadius:10,padding:"10px 12px",fontWeight:650,fontSize:13};
    const exerciseCard = (ex,i) => {
      const id=ids[i], isDone=!!done[id], values=(draft?.day===active && draft?.sets?.[id]) || [];
      const last=[...history].filter(s=>s.sets?.[id]?.length).sort((a,b)=>b.date.localeCompare(a.date))[0];
      return h("section",{key:id+"-"+i,style:{background:COLORS.panel,border:`1px solid ${isDone?"#12684b":COLORS.line}`,borderRadius:14,overflow:"hidden",marginBottom:12}},
        h("div",{style:{display:"flex",alignItems:"center",gap:12,padding:14}},
          h("button",{onClick:()=>toggle(id),"aria-label":isDone?"Undo completed exercise":"Mark exercise done",style:{...buttonStyle,width:42,height:42,padding:0,background:isDone?COLORS.green:buttonStyle.background}},isDone?"✓":String(i+1)),
          h("div",{style:{flex:1,minWidth:0}},h("div",{style:{fontWeight:700}},ex.name),h("div",{style:{fontSize:12,color:COLORS.muted,marginTop:3}},`${ex.sets} sets · ${ex.reps} reps · ${ex.rest} rest`)),
          h("button",{onClick:()=>setChartId(chartId===id?null:id),style:buttonStyle},"Chart")
        ),
          h("button",{onClick:()=>setZoom(correctedImage(id,ex.img)),style:{display:"block",width:"100%",background:"white",border:0,padding:8}},h("img",{src:correctedImage(id,ex.img),alt:ex.name,style:{display:"block",maxHeight:210,maxWidth:"100%",objectFit:"contain",margin:"auto"}})),
        h("div",{style:{padding:"4px 14px 14px"}},
          last && h("div",{style:{fontSize:12,color:"#93c5fd",margin:"8px 0"}},`Last time: ${last.date} · ${last.sets[id].map(s=>`${s.kg||"—"} kg × ${s.reps||"—"}`).join(", ")}`),
          h("div",{style:{display:"grid",gridTemplateColumns:"38px 1fr 1fr",gap:8,alignItems:"center",fontSize:11,color:COLORS.muted,marginTop:8}},h("span",null,"Set"),h("span",null,"kg"),h("span",null,"reps"),
            ...Array.from({length:Math.max(ex.sets,values.length)},(_,n)=>[h("span",{key:`l${n}`},n+1),...["kg","reps"].map(field=>h("input",{key:field+n,type:"number",inputMode:"decimal",min:0,step:field==="kg"?0.5:1,value:values[n]?.[field]??"",placeholder:field==="kg"?"kg":"reps",onChange:e=>setValue(id,n,field,e.target.value),style:{width:"100%",boxSizing:"border-box",background:"#0a0f18",border:`1px solid ${COLORS.line}`,borderRadius:8,padding:10,color:"white",fontSize:16}}))]).flat()
          ),
          chartId===id && chart(id,history)
        ),
        ex.cues?.length>0 && h("details",{style:{padding:"0 14px 14px",color:COLORS.muted}},h("summary",{style:{cursor:"pointer"}},"Coaching cues"),h("ul",null,...ex.cues.map((c,n)=>h("li",{key:n,style:{padding:"3px 0"}},c))))
      );
    };
    const count=Object.values(done).filter(Boolean).length;
    return h("main",{style:{minHeight:"100dvh",background:COLORS.bg,color:COLORS.text,fontFamily:"system-ui,-apple-system,sans-serif",padding:"max(14px,env(safe-area-inset-top)) 14px max(24px,env(safe-area-inset-bottom))",maxWidth:760,margin:"auto"}},
      h("header",{style:{display:"flex",alignItems:"center",gap:10,margin:"8px 0 18px"}},h("div",{style:{fontSize:22,fontWeight:800,flex:1}},"🏋️ Gym Programme"),h("button",{onClick:()=>setShowHistory(!showHistory),style:buttonStyle},"History")),
      error && h("div",{role:"alert",style:{background:"#4b1616",border:"1px solid #ef4444",borderRadius:10,padding:12,marginBottom:12,color:"#fecaca"}},error),
      notice && h("div",{style:{color:"#6ee7b7",marginBottom:8}},notice),
      draft && remaining(draft) && h("div",{style:{background:"#172419",border:"1px solid #166534",padding:10,borderRadius:10,marginBottom:12,fontSize:13}},`Workout in progress · started ${draft.firstDate} · last activity ${new Date(draft.lastActivity).toLocaleTimeString()}`),
      h("nav",{style:{display:"flex",gap:6,overflowX:"auto",paddingBottom:12}},...days.map(d=>h("button",{key:d,onClick:()=>switchDay(d),style:{...buttonStyle,whiteSpace:"nowrap",borderColor:d===active?(program[d].color||COLORS.blue):COLORS.line,color:d===active?(program[d].color||"white"):COLORS.muted}},program[d].name))),
      workout && card(`${workout.icon} ${workout.name} · ${count}/${exercises.length}`,h("div",null,h("div",{style:{color:COLORS.muted,fontSize:13,marginBottom:12}},workout.subtitle),h("button",{onClick:()=>finalize(draft),style:{...buttonStyle,background:COLORS.green,color:"#03140e",border:0}},"Log session"))),
      ...exercises.map(exerciseCard),
      h("section",{style:{display:"flex",gap:8,margin:"18px 0"}},h("button",{onClick:exportData,style:{...buttonStyle,flex:1}},"Export backup"),h("label",{style:{...buttonStyle,flex:1,textAlign:"center",cursor:"pointer"}},"Import backup",h("input",{type:"file",accept:".json,application/json",onChange:importData,style:{display:"none"}}))),
      showHistory && card("Workout history",history.length?h("div",{style:{maxHeight:320,overflowY:"auto"}},...history.map((s,i)=>h("div",{key:i,style:{display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${COLORS.line}`,padding:"9px 0",fontSize:13}},h("span",null,`${s.label} · ${s.date}`),h("span",null,`${s.done}/${s.total}`)))):h("div",{style:{color:COLORS.muted}},"No sessions logged yet.")),
      zoom && h("div",{onClick:()=>setZoom(null),onTouchStart:e=>{e.currentTarget.style.touchAction="pinch-zoom";},style:{position:"fixed",inset:0,zIndex:10,background:"rgba(0,0,0,.96)",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"pinch-zoom"}},h("button",{onClick:()=>setZoom(null),style:{...buttonStyle,position:"absolute",right:16,top:"max(20px,env(safe-area-inset-top))",zIndex:11}},"Close"),h("img",{src:zoom,alt:"Exercise demonstration",onClick:e=>e.stopPropagation(),style:{maxWidth:"100vw",maxHeight:"100dvh",objectFit:"contain",touchAction:"pinch-zoom"}}))
    );
  }
  function chart(id, history) {
    const points=history.filter(s=>Array.isArray(s.sets?.[id]) && s.sets[id].some(x=>Number(x.kg)>0)).slice().sort((a,b)=>a.date.localeCompare(b.date));
    if (!points.length) return h("div",{style:{color:COLORS.muted,fontSize:12,padding:10}},"No logged weight history yet.");
    const vals=points.map(s=>Math.max(...s.sets[id].map(x=>Number(x.kg)||0))); const max=Math.max(...vals,1), min=Math.min(...vals,0), w=320, ht=110;
    const coords=vals.map((v,i)=>`${vals.length===1?w/2:(i/(vals.length-1))*w},${ht-((v-min)/(max-min||1))*(ht-12)-6}`).join(" ");
    return h("div",{style:{marginTop:14}},h("div",{style:{fontSize:12,color:COLORS.muted,marginBottom:6}},"Best set weight by session (kg)"),h("svg",{viewBox:`0 0 ${w} ${ht}`,style:{width:"100%",height:120,background:"#0b111b",borderRadius:8}},h("polyline",{points:coords,fill:"none",stroke:"#60a5fa",strokeWidth:3,strokeLinecap:"round",strokeLinejoin:"round"}),...vals.map((v,i)=>h("circle",{key:i,cx:vals.length===1?w/2:(i/(vals.length-1))*w,cy:ht-((v-min)/(max-min||1))*(ht-12)-6,r:4,fill:"#34d399"}))),h("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:COLORS.muted}},h("span",null,points[0].date),h("span",null,points[points.length-1].date)));
  }
  return { default: App };
})();
