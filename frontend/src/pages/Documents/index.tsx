import React, { useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import {
  uploadMedia,
  createDocument,
  getDocuments,
  createLog,
  updateDocument,
  deleteDocument,
} from '../../services/strapi';

type Doc = {
  id: string;
  documentId?: string;
  attributes?: any;
  [key: string]: any;
};

const STRAPI_URL = 'http://localhost:1338';

const resolveFileUrl = (url?: string) => {
  if (!url) return '';

  if (url.startsWith('http')) return url;

  return `${STRAPI_URL.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
};

const getAttrs = (doc: any) => doc?.attributes || doc || {};

const getFileData = (doc: any) => {
  const attrs = getAttrs(doc);
  const fileRaw = attrs.file || attrs.files;

  if (!fileRaw || typeof fileRaw === 'string') return {};

  if (Array.isArray(fileRaw)) {
    const first = fileRaw[0];
    return first?.data?.attributes || first?.attributes || first || {};
  }

  if (fileRaw.data) {
    const data = Array.isArray(fileRaw.data) ? fileRaw.data[0] : fileRaw.data;
    return data?.attributes || data || {};
  }

  return fileRaw.attributes || fileRaw || {};
};

const getDocumentFileUrl = (doc: any) => {
  const fileData = getFileData(doc);

  return (
    fileData.url ||
    fileData.formats?.large?.url ||
    fileData.formats?.medium?.url ||
    fileData.formats?.small?.url ||
    fileData.formats?.thumbnail?.url ||
    ''
  );
};

const getDocumentName = (doc: any) => {
  const attrs = getAttrs(doc);
  const fileData = getFileData(doc);
  const fileUrl = getDocumentFileUrl(doc);

  let name =
    attrs.name ||
    attrs.title ||
    fileData.name ||
    fileData.fileName ||
    fileData.alternativeText ||
    '';

  if (!name && fileUrl) {
    try {
      name = decodeURIComponent(String(fileUrl).split('/').pop() || '');
    } catch {
      name = String(fileUrl).split('/').pop() || '';
    }
  }

  return name || `document-${Date.now()}`;
};

const getDocumentMime = (doc: any) => {
  const attrs = getAttrs(doc);
  const fileData = getFileData(doc);

  let mime = attrs.metadata?.mime || fileData.mime || fileData.type || '';

  const name = getDocumentName(doc).toLowerCase();

  if (!mime && name.endsWith('.pdf')) mime = 'application/pdf';
  if (!mime && (name.endsWith('.jpg') || name.endsWith('.jpeg'))) mime = 'image/jpeg';
  if (!mime && name.endsWith('.png')) mime = 'image/png';
  if (!mime && name.endsWith('.webp')) mime = 'image/webp';

  return mime;
};

const getUploadedMediaId = (media: any) => {
  const uploaded = Array.isArray(media)
    ? media[0]
    : media?.data
      ? Array.isArray(media.data)
        ? media.data[0]
        : media.data
      : media;

  return uploaded?.id || uploaded?.data?.id || uploaded?.data?.[0]?.id;
};

const makeSignedName = (originalName: string, ext: 'pdf' | 'png') => {
  const cleanName = originalName.replace(/\.[^/.]+$/, '');
  return `${cleanName}-signed.${ext}`;
};

const blobToImage = (blob: Blob) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Nie udało się wczytać obrazu.'));
    };

    img.src = objectUrl;
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement, type = 'image/png') => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Nie udało się wygenerować pliku z canvas.'));
          return;
        }

        resolve(blob);
      },
      type,
      0.95
    );
  });
};

const createSignedImageFile = async (
  originalBlob: Blob,
  signatureBlob: Blob,
  originalName: string
) => {
  const image = await blobToImage(originalBlob);
  const signature = await blobToImage(signatureBlob);

  const canvas = document.createElement('canvas');

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Brak kontekstu canvas.');
  }

  ctx.drawImage(image, 0, 0, width, height);

  const margin = Math.max(24, width * 0.03);
  const signatureWidth = Math.min(width * 0.28, 360);
  const signatureHeight = signatureWidth * (signature.height / signature.width);

  ctx.drawImage(
    signature,
    width - signatureWidth - margin,
    height - signatureHeight - margin,
    signatureWidth,
    signatureHeight
  );

  const signedBlob = await canvasToBlob(canvas, 'image/png');

  return new File([signedBlob], makeSignedName(originalName, 'png'), {
    type: 'image/png',
  });
};

const createSignedPdfFile = async (
  originalBlob: Blob,
  signatureBlob: Blob,
  originalName: string
) => {
  const originalBytes = await originalBlob.arrayBuffer();
  const signatureBytes = await signatureBlob.arrayBuffer();

  const pdfDoc = await PDFDocument.load(originalBytes);
  const signatureImage = await pdfDoc.embedPng(signatureBytes);

  const pages = pdfDoc.getPages();

  if (!pages.length) {
    throw new Error('PDF nie ma żadnych stron.');
  }

  const page = pages[pages.length - 1];

  const { width } = page.getSize();

  const margin = 36;
  const signatureWidth = Math.min(width * 0.28, 180);
  const signatureHeight = signatureWidth * (signatureImage.height / signatureImage.width);

  page.drawImage(signatureImage, {
    x: width - signatureWidth - margin,
    y: margin,
    width: signatureWidth,
    height: signatureHeight,
  });

  const signedPdfBytes = await pdfDoc.save();

  const signedPdfArrayBuffer = new ArrayBuffer(signedPdfBytes.byteLength);
  new Uint8Array(signedPdfArrayBuffer).set(signedPdfBytes);

  return new File([signedPdfArrayBuffer], makeSignedName(originalName, 'pdf'), {
    type: 'application/pdf',
  });
};

const createSignedFile = async (
  originalBlob: Blob,
  signatureBlob: Blob,
  originalName: string,
  mime: string
) => {
  const lowerName = originalName.toLowerCase();
  const lowerMime = mime.toLowerCase();

  const isPdf = lowerMime.includes('pdf') || lowerName.endsWith('.pdf');

  const isImage =
    lowerMime.startsWith('image/') ||
    /\.(png|jpg|jpeg|webp)$/i.test(lowerName);

  if (isPdf) {
    return createSignedPdfFile(originalBlob, signatureBlob, originalName);
  }

  if (isImage) {
    return createSignedImageFile(originalBlob, signatureBlob, originalName);
  }

  throw new Error('Ten typ pliku nie jest obsługiwany. Obsługiwane są PDF, PNG, JPG, JPEG i WEBP.');
};

const Documents: React.FC = () => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [signing, setSigning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await getDocuments({
        'pagination[pageSize]': 50,
        populate: '*',
      });

      const items = res && res.data ? res.data : [];
      setDocs(items);
    } catch (e) {
      console.error('Błąd pobierania dokumentów:', e);
    }
  };

  const uploadAndCreate = async (file: File) => {
    try {
      const media = await uploadMedia(file);

      const uploaded = Array.isArray(media)
        ? media[0]
        : media?.data
          ? Array.isArray(media.data)
            ? media.data[0]
            : media.data
          : media;

      const fileId = uploaded?.id || uploaded?.data?.id || uploaded?.data?.[0]?.id;

      const uploadedAttrs = uploaded?.attributes || uploaded || {};

      const uploadedName =
        uploadedAttrs.name ||
        uploadedAttrs.fileName ||
        uploadedAttrs.alternativeText ||
        file.name;

      const uploadedMime = uploadedAttrs.mime || uploadedAttrs.type || file.type;

      const payload: any = {
        name: uploadedName,
        signed: false,
        metadata: {
          originalFilename: uploadedName,
          mime: uploadedMime,
        },
      };

      if (fileId) {
        payload.file = fileId;
      }

      await createDocument(payload);

      try {
        await createLog({
          type: 'document.upload',
          userId: undefined,
          payload: {
            name: uploadedName,
          },
        });
      } catch {}

      await load();

      alert('Plik przesłany');
    } catch (e: any) {
      console.error('Błąd uploadu pliku:', e);

      const message =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        'Nieznany błąd';

      alert(`Błąd uploadu pliku: ${message}`);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];

    if (!file) return;

    await uploadAndCreate(file);
  };

  const handleChoose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    await uploadAndCreate(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startSigning = (doc: Doc) => {
    setSelected(doc);
    setSigning(true);
  };

  const handleSignCanvas = async (signatureBlob: Blob) => {
    if (!selected) return;

    try {
      const attrs = getAttrs(selected);

      const originalName = getDocumentName(selected);
      const mime = getDocumentMime(selected);
      const rawFileUrl = getDocumentFileUrl(selected);
      const fileUrl = resolveFileUrl(rawFileUrl);

      console.log('Wybrany dokument:', selected);
      console.log('URL pliku z dokumentu:', rawFileUrl);
      console.log('Pobieram plik do podpisu:', fileUrl);

      if (!fileUrl) {
        throw new Error('Nie znaleziono URL pliku dokumentu. Sprawdź, czy relacja file jest zwracana z populate.');
      }

      const originalResponse = await fetch(fileUrl);

      if (!originalResponse.ok) {
        throw new Error(
          `Nie udało się pobrać oryginalnego pliku. Status: ${originalResponse.status}. URL: ${fileUrl}`
        );
      }

      const originalBlob = await originalResponse.blob();

      const signedFile = await createSignedFile(
        originalBlob,
        signatureBlob,
        originalName,
        mime || originalBlob.type
      );

      console.log('Wygenerowany podpisany plik:', signedFile);

      const uploadedMedia = await uploadMedia(signedFile);
      const uploadedFileId = getUploadedMediaId(uploadedMedia);

      console.log('Upload podpisanego pliku:', uploadedMedia);
      console.log('ID podpisanego pliku:', uploadedFileId);

      if (!uploadedFileId) {
        throw new Error('Nie udało się odczytać ID podpisanego pliku po uploadzie.');
      }

      const targetId =
        selected.documentId ||
        selected.id ||
        attrs.documentId ||
        attrs.id;

      if (!targetId) {
        throw new Error('Nie znaleziono ID dokumentu do aktualizacji.');
      }

      const signedAt = new Date().toISOString();

      const payload: any = {
        name: signedFile.name,
        signed: true,
        file: uploadedFileId,
        metadata: {
          ...(attrs.metadata || {}),
          signedAt,
          originalFilename: originalName,
          signedFilename: signedFile.name,
          mime: signedFile.type,
        },
      };

      console.log('Aktualizuję dokument:', targetId, payload);

      await updateDocument(String(targetId), payload);

      try {
        await createLog({
          type: 'document.signed',
          payload: {
            documentId: targetId,
            originalFilename: originalName,
            signedFilename: signedFile.name,
            signedAt,
          },
        });
      } catch {}

      setSigning(false);
      setSelected(null);

      await load();

      alert('Dokument został podpisany.');
    } catch (e: any) {
      console.error('Błąd podczas podpisywania dokumentu:', e);

      const message =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        'Nieznany błąd';

      alert(`Błąd podczas podpisywania dokumentu: ${message}`);
    }
  };

  const handleDelete = async (doc: Doc) => {
    const ok = window.confirm('Na pewno chcesz usunąć dokument? Ta operacja jest nieodwracalna.');

    if (!ok) return;

    try {
      const attrs = getAttrs(doc);

      const targetId =
        doc.documentId ||
        doc.id ||
        attrs.documentId ||
        attrs.id;

      if (!targetId) {
        throw new Error('Nie znaleziono ID dokumentu do usunięcia.');
      }

      const response = await deleteDocument(String(targetId));

      console.info('deleteDocument response', response);

      await load();
    } catch (e: any) {
      console.error('Delete error', e?.response || e);

      const message =
        e?.response?.data?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        'Błąd przy usuwaniu dokumentu';

      alert(message);
    }
  };

  return (
    <div className="page-container">
      <h1>Twoje dokumenty</h1>

      <div
        className={`documents-upload ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleChoose}
          style={{ display: 'none' }}
        />

        <div className="upload-inner">
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            Przeciągnij plik tutaj lub kliknij, aby wybrać.
          </div>
          <div className="upload-hint">
            Obsługiwane: PNG, JPG, PDF
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {docs.length === 0 && <div>Brak dokumentów</div>}

        {docs.map((doc: Doc, index: number) => {
          const attrs = getAttrs(doc);
          const fileUrl = getDocumentFileUrl(doc);
          const resolvedFileUrl = resolveFileUrl(fileUrl);
          const displayName = getDocumentName(doc);
          const fileType = getDocumentMime(doc);

          const isSigned =
            attrs.signed === true ||
            String(attrs.signed) === 'true';

          return (
            <div
              key={doc.id || attrs.id || index}
              style={{
                padding: 10,
                background: '#fff',
                marginBottom: 8,
                borderRadius: 6,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div>
                <strong>{displayName}</strong>

                <div style={{ fontSize: 12, color: '#666' }}>
                  Status: {isSigned ? 'Podpisany' : 'Oczekuje na podpis'}
                </div>

                {isSigned && (
                  <div
                    style={{
                      fontSize: 13,
                      color: '#0f172a',
                      marginTop: 6,
                      fontWeight: 600,
                    }}
                  >
                    To jest podpisany dokument
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#666' }}>
                  Typ pliku: {fileType || '-'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!isSigned && (
                  <button
                    className="btn btn-primary"
                    onClick={() => startSigning(doc)}
                  >
                    Podpisz
                  </button>
                )}

                {resolvedFileUrl && (
                  <a
                    className="btn btn-secondary"
                    href={resolvedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Pobierz
                  </a>
                )}

                <button
                  className="btn btn-ghost"
                  onClick={() => handleDelete(doc)}
                >
                  Usuń
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {signing && selected && (
        <SignerModal
          doc={selected}
          onClose={() => {
            setSigning(false);
            setSelected(null);
          }}
          onSign={handleSignCanvas}
        />
      )}
    </div>
  );
};

export default Documents;

const SignerModal: React.FC<{
  doc: Doc;
  onClose: () => void;
  onSign: (blob: Blob) => void;
}> = ({ doc, onClose, onSign }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [hasSignature, setHasSignature] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;

    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);

    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;

    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx || !lastPointRef.current) return;

    const point = getPoint(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
    setHasSignature(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;

    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    }

    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    if (!hasSignature) {
      alert('Najpierw narysuj podpis.');
      return;
    }

    setLoading(true);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setLoading(false);
          alert('Nie udało się zapisać podpisu.');
          return;
        }

        try {
          await onSign(blob);
        } finally {
          setLoading(false);
        }
      },
      'image/png',
      1
    );
  };

  const attrs = getAttrs(doc);
  const documentName = attrs.name || attrs.title || getDocumentName(doc) || 'dokument';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Podpisz dokument</h3>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginTop: 0, color: '#475569', fontSize: 14 }}>
            Narysuj podpis poniżej. Po zapisaniu zostanie dodany w prawym dolnym rogu pliku:
            <strong> {documentName}</strong>
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <canvas
              ref={canvasRef}
              width={900}
              height={330}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onPointerLeave={(e) => {
                if (drawingRef.current) {
                  stopDrawing(e);
                }
              }}
              style={{
                width: '100%',
                height: 220,
                display: 'block',
                background: '#fff',
                border: '1px dashed #cbd5e1',
                borderRadius: 10,
                touchAction: 'none',
                cursor: 'crosshair',
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn"
            onClick={clearSignature}
            disabled={loading}
          >
            Wyczyść
          </button>

          <button
            className="btn btn-primary"
            onClick={saveSignature}
            disabled={loading}
          >
            {loading ? 'Zapisywanie...' : 'Zapisz podpisany'}
          </button>

          <button
            className="btn"
            onClick={onClose}
            disabled={loading}
          >
            Anuluj
          </button>
        </div>
      </div>
    </div>
  );
};