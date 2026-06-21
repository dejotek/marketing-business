import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { saveFunnel, getFunnel, createLog, uploadMedia } from '../../services/strapi';
import axiosInstance from '../../utils/axiosInstance';
import { getCurrentUserId } from '../../utils/auth';
import { useLocation, useNavigate } from 'react-router-dom';

type Block = {
  id: string;
  type: string;
  title?: string;
  content?: string;
  ctaText?: string;
  ctaUrl?: string;
  mediaUrl?: string;
  mediaMime?: string;
  poster?: string;
};

const PALETTE = [
  { type: 'hero', title: 'Hero (nagłówek)' },
  { type: 'optin', title: 'Formularz opt-in' },
  { type: 'video', title: 'Video / VSL' },
  { type: 'checkout', title: 'Checkout / Payment' },
  { type: 'reservation', title: 'Rezerwacja terminu' },
  { type: 'thankyou', title: 'Thank You' },
];

const createDefaultBlock = (type: string, title: string): Block => {
  if (type === 'reservation') {
    return {
      id: String(Date.now()),
      type,
      title: 'Zarezerwuj termin',
      content: 'Wybierz termin i zostaw swoje dane. Rezerwacja trafi bezpośrednio do kalendarza.',
      ctaText: 'Zarezerwuj termin',
    };
  }

  return {
    id: String(Date.now()),
    type,
    title,
  };
};

const Funnels: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const originalNameRef = useRef<string>('');
  const originalBlocksRef = useRef<Block[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(location.search);
        const id = params.get('documentId') || params.get('id');

        if (id) {
          setEditingId(id);

          const res = await getFunnel(id);
          const record = res && res.data ? res.data : res;
          const attrs = record && record.attributes ? record.attributes : record;

          if (attrs) {
            setName(attrs.name || 'Lejek');

            const loadedBlocks = attrs.blocks || [];

            setBlocks(loadedBlocks);

            originalNameRef.current = attrs.name || '';
            originalBlocksRef.current = loadedBlocks;
          }
        }
      } catch (e) {
        console.error('Błąd pobierania lejka:', e);
      }
    })();
  }, [location.search]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const isDirty =
        name !== originalNameRef.current ||
        JSON.stringify(blocks) !== JSON.stringify(originalBlocksRef.current);

      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }

      return undefined;
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [name, blocks]);

  const reorder = (list: Block[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);

    result.splice(endIndex, 0, removed);

    return result;
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    if (source.droppableId === 'palette' && destination.droppableId === 'canvas') {
      const paletteItem = PALETTE[source.index];
      const newBlock = createDefaultBlock(paletteItem.type, paletteItem.title);

      setBlocks((prev) => {
        const before = prev.slice(0, destination.index);
        const after = prev.slice(destination.index);

        return [...before, newBlock, ...after];
      });

      setSelectedBlockId(newBlock.id);

      return;
    }

    if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
      setBlocks((prev) => reorder(prev, source.index, destination.index));
    }
  };

  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) || null;

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));

    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const selectBlock = (id: string) => setSelectedBlockId(id);

  const updateSelectedBlock = (patch: Partial<Block>) => {
    if (!selectedBlockId) return;

    setBlocks((prev) =>
      prev.map((block) =>
        block.id === selectedBlockId
          ? {
              ...block,
              ...patch,
            }
          : block
      )
    );
  };

  const onMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file || !selectedBlockId) return;

    try {
      const localUrl = URL.createObjectURL(file);

      updateSelectedBlock({
        mediaUrl: localUrl,
        mediaMime: file.type,
      });

      const res = await uploadMedia(file);

      let item: any = res;

      if (res && res.data) item = res.data;
      if (Array.isArray(item)) item = item[0];

      const url = item && (item.url || (item.attributes && item.attributes.url));
      const mime = item && (item.mime || (item.attributes && item.attributes.mime)) || file.type;

      let finalUrl = url;

      if (finalUrl && finalUrl.startsWith('/')) {
        const base = (axiosInstance.defaults.baseURL as string) || '';
        const backendOrigin = base.replace(/\/api\/?$/, '') || window.location.origin;

        finalUrl = backendOrigin + finalUrl;
      }

      if (finalUrl) {
        updateSelectedBlock({
          mediaUrl: finalUrl,
          mediaMime: mime,
        });
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('Błąd przesyłania pliku');
    }
  };

  const save = async () => {
    setSaving(true);

    try {
      const payload = {
        name,
        blocks,
      };

      if (editingId) {
        await saveFunnel(payload, editingId);
        alert('Lejek zaktualizowany.');
      } else {
        await saveFunnel(payload);
        alert('Lejek zapisany.');
      }

      try {
        const uid = getCurrentUserId();

        await createLog({
          type: 'funnel.saved',
          userId: uid,
          payload: {
            name,
            editingId,
            blocksLength: blocks.length,
          },
        });
      } catch {}

      navigate('/app/funnels/list');
    } catch (err) {
      console.error(err);
      alert('Błąd zapisu (sprawdź backend)');
    } finally {
      setSaving(false);
    }
  };

  const extractId = (res: any) => {
    if (!res) return null;

    if (res.id) return String(res.id);
    if (res._id) return String(res._id);

    if (res.data) {
      if (res.data.id) return String(res.data.id);
      if (res.data._id) return String(res.data._id);
      if (res.data.data && res.data.data.id) return String(res.data.data.id);
      if (Array.isArray(res.data) && res.data.length && res.data[0].id) {
        return String(res.data[0].id);
      }
    }

    return null;
  };

  const shareFunnel = async () => {
    try {
      let id = editingId;

      if (!id) {
        const payload = {
          name,
          blocks,
        };

        const res = await saveFunnel(payload);

        id = extractId(res);

        if (!id) {
          alert('Nie udało się wygenerować linku (brak id).');
          return;
        }

        setEditingId(id);

        originalNameRef.current = name;
        originalBlocksRef.current = blocks;
      }

      const shareUrl = `${window.location.origin}/funnel/view?documentId=${encodeURIComponent(id)}`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Link skopiowany do schowka:\n' + shareUrl);
      } catch {
        window.open(shareUrl, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert('Błąd podczas udostępniania lejka');
    }
  };

  const exportJSON = () => {
    const data = {
      name,
      blocks,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${name.replace(/\s+/g, '-').toLowerCase() || 'funnel'}.json`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (parsed.name) setName(parsed.name);
        if (parsed.blocks) setBlocks(parsed.blocks);

        alert('Lejek zaimportowany lokalnie');
      } catch {
        alert('Błąd importu JSON');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              const isDirty =
                name !== originalNameRef.current ||
                JSON.stringify(blocks) !== JSON.stringify(originalBlocksRef.current);

              if (isDirty) {
                const ok = window.confirm('Czy na pewno chcesz wyjść bez zapisu?');

                if (!ok) return;
              }

              navigate(-1);
            }}
          >
            Powrót
          </button>

          <div>
            <h1>Lejki sprzedaży — Builder</h1>

            <p style={{ marginTop: 4, color: '#6b7280' }}>
              Zbuduj stronę lejka przeciągając bloki z palety. Każdy blok można konfigurować.
            </p>
          </div>
        </div>

        <div>
          <input
            value={name}
            placeholder="Wprowadź nazwę lejka"
            onChange={(e) => setName(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid #e6e9ef',
            }}
          />

          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
            style={{ marginLeft: 12 }}
          >
            {saving ? 'Zapis...' : 'Zapisz lejek'}
          </button>

          <button
            className="btn btn-success"
            onClick={exportJSON}
            style={{ marginLeft: 12 }}
          >
            Export JSON
          </button>

          <button
            className="btn btn-secondary"
            onClick={shareFunnel}
            style={{ marginLeft: 12 }}
          >
            Udostępnij
          </button>

          <label style={{ marginLeft: 12 }} className="btn btn-ghost">
            Import
            <input
              type="file"
              accept="application/json"
              onChange={importJSON}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="funnels-builder">
        <DragDropContext onDragEnd={onDragEnd}>
          <aside className="palette">
            <h4>Paleta bloków</h4>

            <Droppable droppableId="palette" isDropDisabled={true} direction="vertical">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {PALETTE.map((paletteItem, index) => (
                    <Draggable
                      key={paletteItem.type}
                      draggableId={`palette-${paletteItem.type}`}
                      index={index}
                    >
                      {(prov) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="palette-item"
                        >
                          <div className="palette-title">{paletteItem.title}</div>
                          <div className="palette-sub">{paletteItem.type}</div>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </aside>

          <Droppable droppableId="canvas">
            {(provided) => (
              <section ref={provided.innerRef} className="canvas" {...provided.droppableProps}>
                {blocks.length === 0 && (
                  <div className="canvas-empty">
                    Przeciągnij tutaj bloki aby zbudować lejek
                  </div>
                )}

                {blocks.map((block, index) => (
                  <Draggable key={block.id} draggableId={block.id} index={index}>
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={`canvas-block ${selectedBlockId === block.id ? 'selected' : ''}`}
                        onClick={() => selectBlock(block.id)}
                      >
                        <div>
                          <strong>{block.title}</strong>

                          <div className="block-type">
                            {block.type === 'reservation'
                              ? 'rezerwacja terminu'
                              : block.type}
                          </div>

                          {block.content && (
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                              {block.content}
                            </div>
                          )}
                        </div>

                        <div>
                          <button
                            className="btn btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBlock(block.id);
                            }}
                            style={{ marginRight: 8 }}
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}
              </section>
            )}
          </Droppable>
        </DragDropContext>

        <aside className="block-editor">
          {selectedBlock ? (
            <div>
              <h4>Edytuj blok</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label>Tytuł</label>

                <input
                  value={selectedBlock.title || ''}
                  onChange={(e) => updateSelectedBlock({ title: e.target.value })}
                />

                <label>
                  {selectedBlock.type === 'reservation'
                    ? 'Opis nad formularzem'
                    : 'Treść'}
                </label>

                <textarea
                  value={selectedBlock.content || ''}
                  onChange={(e) => updateSelectedBlock({ content: e.target.value })}
                  rows={4}
                />

                <label>
                  {selectedBlock.type === 'reservation'
                    ? 'Tekst przycisku rezerwacji'
                    : 'Tekst CTA'}
                </label>

                <input
                  value={selectedBlock.ctaText || ''}
                  onChange={(e) => updateSelectedBlock({ ctaText: e.target.value })}
                />

                {selectedBlock.type !== 'reservation' && (
                  <>
                    <label>URL CTA</label>

                    <input
                      value={selectedBlock.ctaUrl || ''}
                      onChange={(e) => updateSelectedBlock({ ctaUrl: e.target.value })}
                    />
                  </>
                )}

                {selectedBlock.type === 'reservation' && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 13,
                      color: '#475569',
                    }}
                  >
                    Ten blok wyświetli formularz rezerwacji terminu. Po wysłaniu formularza wydarzenie zostanie dodane do kalendarza, o ile termin nie nachodzi na blokadę.
                  </div>
                )}

                {selectedBlock.type === 'video' && (
                  <>
                    <label>Media (wideo/obraz)</label>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <label
                        className="btn btn-ghost"
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        Wybierz plik

                        <input
                          type="file"
                          accept="video/*,image/*"
                          onChange={onMediaChange}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {selectedBlock.mediaUrl && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 13, color: '#374151' }}>
                            Podgląd:
                          </div>

                          <div
                            style={{
                              width: 180,
                              height: 100,
                              borderRadius: 8,
                              overflow: 'hidden',
                              background: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {selectedBlock.mediaMime && selectedBlock.mediaMime.startsWith('image') ? (
                              <img
                                src={selectedBlock.mediaUrl}
                                alt={selectedBlock.title || 'media'}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <video
                                src={selectedBlock.mediaUrl}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                muted
                                playsInline
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      setSelectedBlockId(null);
                    }}
                    className="btn btn-ghost"
                  >
                    Zamknij
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}>
              Wybierz blok z kanwy aby go skonfigurować.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Funnels;