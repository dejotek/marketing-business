import React, { useEffect, useState } from 'react';
import './crm.css';
import axiosInstance from '../../utils/axiosInstance';
import { getContacts, createContact, updateContact, deleteContact, uploadMedia, setCRMResource } from '../../services/strapi';

type Todo = { title: string; done?: boolean; dueDate?: string; notes?: string };

type Contact = {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  notes?: string;
  todos?: Todo[];
  avatar?: string; // URL or placeholder
  _uploadedAvatar?: any; // internal: uploaded file object (id/url)
};

const emptyContact = (): Contact => ({ firstName: '', lastName: '', name: '', email: '', phone: '', tags: [], notes: '', todos: [] });

const CRM: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rightView, setRightView] = useState<'summary' | 'detail'>('summary');
  const [avatarDrag, setAvatarDrag] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await getContacts();
      // support different shapes
      let items = res && res.data ? res.data : res;
      if (items && items.data) items = items.data;
      if (!Array.isArray(items)) items = Array.isArray(res) ? res : [];
      const normalized = items.map((it: any) => {
        const attrs = it.attributes || it;
        const firstName = attrs.firstName || '';
        const lastName = attrs.lastName || '';
        const name = firstName || lastName ? `${firstName} ${lastName}`.trim() : (attrs.name || attrs.title || '');
        // resolve avatar URL from possible Strapi shapes
        let avatarUrl: any = '';
        try {
          if (attrs.avatar && attrs.avatar.data) {
            const d = attrs.avatar.data;
            const fileObj = Array.isArray(d) && d.length ? d[0] : d;
            avatarUrl = fileObj?.attributes?.url || fileObj?.url || '';
          } else if (attrs.avatar && attrs.avatar.url) avatarUrl = attrs.avatar.url;
        } catch (e) { avatarUrl = '' }
        // prefix relative urls with backend origin
        if (typeof avatarUrl === 'string' && avatarUrl.startsWith('/')) {
          const origin = axiosInstance.defaults.baseURL.replace(/\/api\/?$/,'');
          avatarUrl = origin + avatarUrl;
        }
        return { id: it.id || it._id || attrs.id || undefined, firstName, lastName, name, email: attrs.email || '', phone: attrs.phone || '', tags: attrs.tags || attrs.tagList || [], notes: attrs.notes || '', todos: attrs.todos || [], avatar: avatarUrl } as Contact;
      });
      setContacts(normalized);
      // do not auto-select any contact on load
    } catch (err) {
      console.error('Failed to load contacts', err);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setCRMResource('contacts'); load(); }, []);

  const [viewMode, setViewMode] = useState<'list'|'grid'>('list');

  const filtered = contacts.filter(c => (c.name||'').toLowerCase().includes(query.toLowerCase()) || (c.email||'').toLowerCase().includes(query.toLowerCase()));

  const onNew = () => { setEditing(emptyContact()); setSelected(null); setModalOpen(true); };

  const onSave = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        const ident = (editing as any).documentId || editing.id;
        await updateContact(String(ident), editing);
      } else {
        await createContact(editing);
      }
      await load();
      setEditing(null);
      alert('Zapisano');
    } catch (err) { console.error(err); alert('Błąd zapisu'); }
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    const ok = window.confirm('Usunąć kontakt?');
    if (!ok) return;
    try {
      await deleteContact(id);
      await load();
      setSelected(null);
    } catch (err) { console.error(err); alert('Błąd usuwania'); }
  };

  const openEditModal = (c: Contact) => { setEditing(c); setModalOpen(true); };

  const onContactClick = (c: Contact) => {
    // initialize editable notes array on selection
    const notesArr = Array.isArray((c as any).notes) ? (c as any).notes : (typeof (c as any).notes === 'string' && (c as any).notes ? (c as any).notes.split('\n\n') : []);
    setSelected({ ...c, _notes: notesArr } as any);
    setRightView('detail');
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSaveFromModal = async () => {
    if (!editing) return;
    try {
      // Check duplicates for email/phone before creating
      const checkForExisting = async (field: 'email'|'phone', value: string) => {
        if (!value) return [];
        const q = (value || '').toString().trim();
        if (!q) return [];
        // attempt a server-side filter first
        const params: any = {};
        if (field === 'email') params['filters[email][$eq]'] = q;
        if (field === 'phone') params['filters[phone][$eq]'] = q;
        const res: any = await getContacts(params);
        let items = res && res.data ? res.data : res;
        if (items && items.data) items = items.data;
        if (!Array.isArray(items) && Array.isArray(res)) items = res;
        if (!Array.isArray(items)) return [];
        // normalize and exact-match client-side to avoid false positives
        const norm = q.toLowerCase();
        const matches = items.filter((it: any) => {
          const attrs = it.attributes || it;
          const val = (attrs[field] || it[field] || '').toString().toLowerCase().trim();
          return val === norm;
        });
        return matches;
      };

      if (!editing.id) {
        const emailMatches = editing.email ? await checkForExisting('email', editing.email) : [];
        if (emailMatches.length) { alert('Email już istnieje'); return; }
        // check phone
        if (editing.phone) {
          const pitems = await checkForExisting('phone', editing.phone);
          if (pitems.length) { alert('Telefon już istnieje'); return; }
        }
        const payloadCreate = { ...editing } as Contact;
        if (!Array.isArray(payloadCreate.todos)) payloadCreate.todos = selected?.todos ? [...selected.todos] : [];
        await createContact(payloadCreate);
      } else {
        const payloadUpdate = { ...editing } as Contact;
        if (!Array.isArray(payloadUpdate.todos)) payloadUpdate.todos = selected?.todos ? [...selected.todos] : [];
        const ident = (editing as any).documentId || editing.id;
        await updateContact(String(ident), payloadUpdate);
      }
      await load();
      setModalOpen(false);
      setEditing(null);
      setRightView('detail');
    } catch (e) { console.error(e); alert('Błąd zapisu'); }
  };

  return (
    <div className="page-container">
      <h1>CRM — Kontakty i Leady</h1>

      <div className="crm-container">
        {!selected ? (
          <div style={{display:'flex', gap:20, width: '100%'}}>
            <div className="crm-list" style={{flex:1}}>
              <div className="controls" style={{display:'flex',gap:12,alignItems:'center'}}>
                <input className="crm-search" placeholder="Szukaj kontaktu" value={query} onChange={e => setQuery(e.target.value)} />
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button title="Lista" className={`btn ${viewMode==='list'?'btn-primary':''}`} onClick={() => setViewMode('list')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="3" rx="1" fill="currentColor"/><rect x="3" y="10.5" width="18" height="3" rx="1" fill="currentColor"/><rect x="3" y="17" width="18" height="3" rx="1" fill="currentColor"/></svg>
                  </button>
                  <button title="Siatka" className={`btn ${viewMode==='grid'?'btn-primary':''}`} onClick={() => setViewMode('grid')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="1" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="1" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="1" fill="currentColor"/></svg>
                  </button>
                </div>
                <button className="btn btn-primary" onClick={onNew}>Nowy</button>
              </div>

              <div className={`contact-list ${viewMode==='grid'?'grid':'list'}`}>
                {loading && <div style={{padding:12}}>Ładowanie...</div>}
                {!loading && filtered.map((c: any) => (
                  <div key={c.id || c.email} className="contact-card" onClick={() => onContactClick(c)}>
                    {c.avatar ? (
                      <img className="avatar" src={c.avatar} alt="avatar" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
                    ) : (
                      <div className="avatar" />
                    )}
                    <div className="content">
                      <strong>{c.name}</strong>
                      <div className="contact-meta">{c.email}</div>
                      <div className="contact-meta">{(c.tags || []).join(', ')}</div>
                    </div>
                  </div>
                ))}
                {!loading && filtered.length === 0 && <div style={{padding:12}}>Brak wyników</div>}
              </div>
            </div>

          </div>
        ) : (
          <div style={{width:'100%'}}>
            <div className="details-card nested-panel">
              <div className="panel active">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                  <button className="back-btn" onClick={() => setSelected(null)}>Powrót</button>
                  <div style={{display:'flex', gap:8}}>
                    <button className="btn" onClick={() => openEditModal(selected)}>Edytuj</button>
                    <button className="btn btn-primary" onClick={async () => {
                      try {
                        const ident = (selected as any).documentId || selected.id;
                        if (!selected || !ident) return;
                        // prepare payload: serialize notes array into string separated by double newline
                        const payload: any = { ...selected };
                        if ((selected as any)._notes) payload.notes = (selected as any)._notes.join('\n\n');
                        // ensure todos is an array
                        payload.todos = Array.isArray(selected.todos) ? selected.todos : [];
                        await updateContact(String(ident), payload);
                        await load();
                        alert('Zapisano');
                      } catch (e) { console.error(e); alert('Błąd zapisu'); }
                    }}>Zapisz</button>
                  </div>
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:12}}>
                  <div style={{display:'flex', gap:12, alignItems:'center'}}>
                    <div style={{width:96, height:96, flex:'0 0 96px'}}>
                      {selected.avatar ? (
                        <img className="detail-avatar" src={selected.avatar} alt="avatar" />
                      ) : (
                        <div className="detail-avatar" />
                      )}
                    </div>
                    <div style={{flex:1}}>
                      <h2 style={{margin:0}}>{(selected.firstName || '') + (selected.lastName ? ' ' + selected.lastName : '')}</h2>
                      <div style={{marginTop:8}}><strong>Email:</strong> {selected.email || '—'}</div>
                      <div style={{marginTop:4}}><strong>Telefon:</strong> {selected.phone || '—'}</div>
                    </div>
                  </div>

                  <div>
                    <label style={{display:'block', marginBottom:6}}><strong>Notatki</strong></label>
                    <div className="notes-list">
                      {((selected as any)._notes || []).map((note: string, idx: number) => (
                        <div key={idx} className="note-item">
                          <textarea value={note} onChange={e => { const copy = [ ...((selected as any)._notes || []) ]; copy[idx] = e.target.value; setSelected({...selected, _notes: copy} as any); }} rows={2} />
                          <button className="btn" onClick={() => { const copy = [ ...((selected as any)._notes || []) ]; copy.splice(idx,1); setSelected({...selected, _notes: copy} as any); }}>Usuń</button>
                        </div>
                      ))}
                      <button className="btn btn-secondary" onClick={() => { const copy = [ ...((selected as any)._notes || []) ]; copy.push(''); setSelected({...selected, _notes: copy} as any); }}>Dodaj notatkę</button>
                    </div>
                  </div>

                  <div>
                    <label style={{display:'block', marginBottom:6}}><strong>Todo lista</strong></label>
                    <div className="todo-list">
                      {(selected.todos || []).map((t, idx) => (
                        <div key={idx} className="todo-item">
                          <input type="checkbox" checked={!!t.done} onChange={e => { const copy = (selected.todos||[]).slice(); copy[idx] = {...copy[idx], done: e.target.checked}; setSelected({...selected, todos: copy}); }} />
                          <input type="text" value={t.title} onChange={e => { const copy = (selected.todos||[]).slice(); copy[idx] = {...copy[idx], title: e.target.value}; setSelected({...selected, todos: copy}); }} />
                          <button className="btn" onClick={() => { const copy = (selected.todos||[]).slice(); copy.splice(idx,1); setSelected({...selected, todos: copy}); }}>Usuń</button>
                        </div>
                      ))}
                      <button className="btn btn-secondary" onClick={() => setSelected({...selected, todos: [ ...(selected.todos||[]), { title: 'Nowe zadanie' } ] })}>Dodaj zadanie</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {modalOpen && editing && (
        <div className="overlay">
          <div className="modal">
            <h3>{editing.id ? 'Edytuj kontakt' : 'Nowy kontakt'}</h3>
            <div className="row"><label>Imię</label><input value={editing.firstName} onChange={e => setEditing({ ...editing, firstName: e.target.value })} /></div>
            <div className="row"><label>Nazwisko</label><input value={editing.lastName} onChange={e => setEditing({ ...editing, lastName: e.target.value })} /></div>
            <div className="row"><label>Email</label><input value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} /></div>
            <div className="row"><label>Telefon</label><input value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div className="row"><label>Avatar</label>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <div
                  className={`avatar-drop ${avatarDrag ? 'dragover' : ''}`}
                  onDragOver={e => { e.preventDefault(); setAvatarDrag(true); }}
                  onDragLeave={e => { e.preventDefault(); setAvatarDrag(false); }}
                  onDrop={async e => {
                    e.preventDefault(); setAvatarDrag(false);
                    const f = e.dataTransfer?.files?.[0];
                    if (!f) return;
                    try {
                      const up = await uploadMedia(f as File);
                      let fileObj: any = null;
                      if (up && up.data) fileObj = Array.isArray(up.data) ? up.data[0] : up.data;
                      else if (Array.isArray(up)) fileObj = up[0];
                      if (fileObj) {
                        const url = fileObj.attributes?.url || fileObj.url || '';
                        const origin = axiosInstance.defaults.baseURL.replace(/\/api\/?$/,'');
                        const full = typeof url === 'string' && url.startsWith('/') ? origin + url : url;
                        setEditing({ ...editing, _uploadedAvatar: fileObj, avatar: full } as any);
                      }
                    } catch (err) { console.error(err); alert('Błąd uploadu'); }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={el => (fileInputRef.current = el)} type="file" accept="image/*" style={{display:'none'}} onChange={async (ev) => {
                    const f = (ev.target as HTMLInputElement).files?.[0];
                    if (!f) return;
                    try {
                      const up = await uploadMedia(f as File);
                      let fileObj: any = null;
                      if (up && up.data) fileObj = Array.isArray(up.data) ? up.data[0] : up.data;
                      else if (Array.isArray(up)) fileObj = up[0];
                      if (fileObj) {
                        const url = fileObj.attributes?.url || fileObj.url || '';
                        const origin = axiosInstance.defaults.baseURL.replace(/\/api\/?$/,'');
                        const full = typeof url === 'string' && url.startsWith('/') ? origin + url : url;
                        setEditing({ ...editing, _uploadedAvatar: fileObj, avatar: full } as any);
                      }
                    } catch (err) { console.error(err); alert('Błąd uploadu'); }
                  }} />
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    {editing?.avatar ? <img src={editing.avatar} className="avatar-preview" alt="preview" /> : <div className="avatar-preview" />}
                    <div style={{display:'flex',flexDirection:'column'}}>
                      <strong>Przeciągnij obraz lub kliknij</strong>
                      <span style={{color:'#6b7280', fontSize:13}}>PNG, JPG, max. 5MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="row"><label>Notatki</label><textarea value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={4} /></div>
            {/* Modal: todo list removed — todos are editable in the detail view */}
            <div className="actions">
              <button className="btn" onClick={closeModal}>Anuluj</button>
              {editing?.id && (
                <button className="btn btn-danger" onClick={async () => {
                  const ok = window.confirm('Na pewno usunąć ten kontakt?');
                  if (!ok) return;
                  try {
                    const ident = (editing as any).documentId || editing.id;
                    if (!ident) return;
                    await deleteContact(String(ident));
                    await load();
                    setModalOpen(false);
                    setEditing(null);
                    setSelected(null);
                    alert('Kontakt usunięty');
                  } catch (err) { console.error(err); alert('Błąd usuwania'); }
                }}>Usuń</button>
              )}
              <button className="btn btn-primary" onClick={handleSaveFromModal}>Zapisz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
