// ===== Helpers & State =====
const $ = (id) => document.getElementById(id);
const storeKey = 'gratitude.v1.entries';
let entries = [];

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' });
const todayISO = () => new Date().toISOString().slice(0,10);

function safeLoad() {
  try { return JSON.parse(localStorage.getItem(storeKey)) || []; }
  catch { return []; }
}
function persist() {
  localStorage.setItem(storeKey, JSON.stringify(entries));
}

function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }

function computeStreak(){
  if(!entries.length) return 0;
  const days = new Set(entries.map(e => e.date));
  let d = new Date();
  let streak = 0;
  for(;;){
    const iso = d.toISOString().slice(0,10);
    if(days.has(iso)){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"]/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])
  );
}

// ===== Rendering =====
function entryHtml(e){
  const tags = (e.tags||[]).map(t => `<span class="tag">#${t}</span>`).join('');
  const preview = [e.g1,e.g2,e.g3].filter(Boolean).join(' • ');
  return `
    <article class="entry" data-id="${e.id}">
      <h3>${e.mood||''} ${fmtDate(e.date)} — ${preview || 'No text'}</h3>
      <div class="meta">
        ${e.feel ? ('Feeling: '+e.feel+' · '):''}
        ${(e.tags&&e.tags.length)?('Tags: '+e.tags.join(', ')+' · '):''}
        Saved at ${new Date(e.savedAt).toLocaleTimeString()}
      </div>
      ${e.notes ? `<p style="margin:8px 0 0">${escapeHtml(e.notes)}</p>` : ''}
      <div class="tags">${tags}</div>
      <div class="tools">
        <button class="btn subtle" onclick="editEntry('${e.id}')">Edit</button>
        <button class="btn subtle" onclick="duplicateEntry('${e.id}')">Duplicate</button>
        <button class="btn" style="background:#fff;border-color:#FCA5A5;color:#B91C1C"
                onclick="deleteEntry('${e.id}')">Delete</button>
      </div>
    </article>`;
}

function render(list = entries){
  $('today').textContent = new Date().toLocaleDateString(undefined,
    { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  $('streak').textContent = computeStreak();
  $('count').textContent = `${entries.length} entr${entries.length===1?'y':'ies'}`;
  $('list').innerHTML = list
    .slice()
    .sort((a,b)=> b.date.localeCompare(a.date) || b.savedAt - a.savedAt)
    .map(entryHtml).join('');
  $('date').value ||= todayISO();
}

// ===== CRUD =====
let editingId = null;

function clearEditor(){
  ['g1','g2','g3','notes','tags','feel'].forEach(id => $(id).value='');
  $('mood').value='😊';
  $('date').value = todayISO();
  editingId = null;
}

function saveEntry(){
  const e = {
    id: editingId || uid(),
    date: $('date').value || todayISO(),
    g1: $('g1').value.trim(),
    g2: $('g2').value.trim(),
    g3: $('g3').value.trim(),
    notes: $('notes').value.trim(),
    mood: $('mood').value,
    tags: $('tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    feel: $('feel').value.trim(),
    savedAt: Date.now()
  };

  if (editingId){
    const idx = entries.findIndex(x=>x.id===editingId);
    if(idx>-1) entries[idx] = e;
  } else {
    entries.push(e);
  }
  persist();
  render();
  clearEditor();
}

function editEntry(id){
  const e = entries.find(x=>x.id===id); if(!e) return;
  editingId = id;
  $('date').value = e.date;
  $('g1').value = e.g1||'';
  $('g2').value = e.g2||'';
  $('g3').value = e.g3||'';
  $('notes').value = e.notes||'';
  $('mood').value = e.mood||'😊';
  $('tags').value = (e.tags||[]).join(', ');
  $('feel').value = e.feel||'';
  window.scrollTo({top:0, behavior:'smooth'});
}

function duplicateEntry(id){
  const e = entries.find(x=>x.id===id); if(!e) return;
  const copy = {...e, id: uid(), savedAt: Date.now()};
  entries.push(copy);
  persist(); render();
}

function deleteEntry(id){
  if(!confirm('Delete this entry?')) return;
  entries = entries.filter(x => x.id !== id);
  persist(); render();
}

// ===== Filter & Search =====
function filter(){
  const q = $('q').value.toLowerCase();
  const from = $('from').value; const to = $('to').value;
  const list = entries.filter(e => {
    const text = [e.g1,e.g2,e.g3,e.notes,(e.tags||[]).join(','),e.mood,e.feel]
      .join(' ').toLowerCase();
    if(q && !text.includes(q)) return false;
    if(from && e.date < from) return false;
    if(to && e.date > to) return false;
    return true;
  });
  render(list);
}

// ===== Export / Import =====
function exportJson(){
  const blob = new Blob([JSON.stringify(entries,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  dl(url, 'gratitude-entries.json');
}
function exportCsv(){
  const cols = ['id','date','g1','g2','g3','notes','mood','tags','feel','savedAt'];
  const rows = entries.map(e => cols.map(k => {
    let v = (k==='tags') ? (e[k]||[]).join('|') : (e[k] ?? '');
    v = (''+v).replace(/"/g,'""');
    return `"${v}"`;
  }).join(','));
  const csv = [cols.join(','), ...rows].join('\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  dl(url, 'gratitude-entries.csv');
}
function dl(url,name){
  const a = document.createElement('a');
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function importJsonFile(file){
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const data = JSON.parse(e.target.result);
      if(!Array.isArray(data)) return alert('Invalid file: expected a JSON array.');
      const byId = Object.fromEntries(entries.map(x=>[x.id,x]));
      data.forEach(x => byId[x.id] = x);
      entries = Object.values(byId);
      persist(); render();
      alert('Import complete.');
    }catch{ alert('Could not parse JSON.'); }
  };
  reader.readAsText(file);
}

// ===== Prompts =====
const prompts = [
  'Name one blessing you usually overlook.',
  'Who helped you recently? Make du‘ā for them.',
  'Recall a hardship that turned into ease.',
  'What small beauty did you notice today?',
  'Write one thing about your health you’re grateful for.',
  'Which skill are you improving by Allah’s grace?',
  'What brought you sakīnah (calm) today?'
];
function showPrompt(){
  const i = new Date().getDate() % prompts.length;
  $('prompt').textContent = prompts[i];
}

// ===== Init & Events =====
window.addEventListener('DOMContentLoaded', () => {
  $('date').value = todayISO();
  $('today').textContent = new Date().toLocaleDateString();
  showPrompt();

  entries = safeLoad();
  render();

  // Buttons
  $('saveBtn').addEventListener('click', saveEntry);
  $('clearBtn').addEventListener('click', clearEditor);
  $('filterBtn').addEventListener('click', filter);
  $('resetBtn').addEventListener('click', () => {
    $('q').value=''; $('from').value=''; $('to').value=''; render();
  });
  $('q').addEventListener('input', filter);

  $('exportJson').addEventListener('click', exportJson);
  $('exportCsv').addEventListener('click', exportCsv);

  $('importFile').addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if(f) importJsonFile(f);
    e.target.value = '';
  });

  // Keyboard save (Ctrl/Cmd+S)
  window.addEventListener('keydown', (ev) => {
    const s = (ev.key === 's' || ev.key === 'S');
    if(s && (ev.ctrlKey || ev.metaKey)){
      ev.preventDefault();
      saveEntry();
    }
  });
});
