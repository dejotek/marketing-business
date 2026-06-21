import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import {
  getContacts,
  createLog,
} from '../../services/strapi';

type NormalizedContact = {
  id?: string;
  documentId?: string;
  name: string;
  email: string;
  phone?: string;
};

const SEND_ENDPOINT = '/smtp/send';

const normalizeContact = (item: any): NormalizedContact => {
  const attrs = item?.attributes || item || {};

  const firstName = attrs.firstName || '';
  const lastName = attrs.lastName || '';

  const name =
    firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : attrs.name || attrs.title || 'Bez nazwy';

  return {
    id: item?.id || attrs.id,
    documentId: item?.documentId || attrs.documentId,
    name,
    email: attrs.email || '',
    phone: attrs.phone || '',
  };
};

const Integrations: React.FC = () => {
  const [contacts, setContacts] = useState<NormalizedContact[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoadingContacts(true);

    try {
      const res: any = await getContacts();

      let items = res?.data ? res.data : res;

      if (items?.data) {
        items = items.data;
      }

      if (!Array.isArray(items)) {
        items = Array.isArray(res) ? res : [];
      }

      const normalized = items
        .map(normalizeContact)
        .filter((contact: NormalizedContact) => !!contact.email);

      setContacts(normalized);
    } catch (err) {
      console.error('Błąd pobierania kontaktów:', err);
      alert('Nie udało się pobrać kontaktów z CRM.');
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const value = query.toLowerCase().trim();

    if (!value) return contacts;

    return contacts.filter((contact) => {
      return (
        contact.name.toLowerCase().includes(value) ||
        contact.email.toLowerCase().includes(value) ||
        String(contact.phone || '').toLowerCase().includes(value)
      );
    });
  }, [contacts, query]);

  const selectedContacts = useMemo(() => {
    return contacts.filter((contact) => selectedEmails.includes(contact.email));
  }, [contacts, selectedEmails]);

  const isSelected = (email: string) => selectedEmails.includes(email);

  const toggleContact = (email: string) => {
    setSelectedEmails((prev) => {
      if (prev.includes(email)) {
        return prev.filter((item) => item !== email);
      }

      return [...prev, email];
    });
  };

  const selectAllFiltered = () => {
    const filteredEmails = filteredContacts.map((contact) => contact.email);

    setSelectedEmails((prev) => {
      const merged = [...prev];

      filteredEmails.forEach((email) => {
        if (!merged.includes(email)) {
          merged.push(email);
        }
      });

      return merged;
    });
  };

  const clearSelection = () => {
    setSelectedEmails([]);
  };

  const validateBeforeSend = () => {
    if (!selectedContacts.length) {
      alert('Wybierz przynajmniej jednego odbiorcę.');
      return false;
    }

    if (!subject.trim()) {
      alert('Wpisz tytuł wiadomości.');
      return false;
    }

    if (!message.trim()) {
      alert('Wpisz treść wiadomości.');
      return false;
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateBeforeSend()) return;

    setSending(true);

    try {
      const payload = {
        subject: subject.trim(),
        message: message.trim(),
        recipients: selectedContacts.map((contact) => ({
          id: contact.id,
          documentId: contact.documentId,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
        })),
      };

      const res = await axiosInstance.post(SEND_ENDPOINT, payload);

      const sent = res?.data?.sent || 0;
      const failed = res?.data?.failed || 0;

      try {
        await createLog({
          type: 'email.smtp.sent',
          payload: {
            subject: subject.trim(),
            sent,
            failed,
            recipients: selectedContacts.map((contact) => contact.email),
          },
        });
      } catch (logErr) {
        console.warn('Nie udało się zapisać logu wysyłki:', logErr);
      }

      if (failed > 0) {
        alert(`Wiadomość częściowo wysłana. Wysłano: ${sent}, błędy: ${failed}. Szczegóły są w konsoli.`);
        console.log('Szczegóły wysyłki:', res.data);
      } else {
        alert(`Wiadomość została wysłana do ${sent} odbiorców.`);
      }

      setSubject('');
      setMessage('');
      setSelectedEmails([]);
    } catch (err: any) {
      console.error('Błąd wysyłki wiadomości:', err);

      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Nieznany błąd';

      alert(`Nie udało się wysłać wiadomości: ${errorMessage}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Integracje</h1>

      <section
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2>Moduł wysyłki e-mail</h2>

        <p style={{ color: '#64748b', marginTop: 0 }}>
          Wybierz kontakty z CRM, wpisz tytuł oraz treść wiadomości. System wyśle maila
          z firmowego adresu skonfigurowanego po stronie Strapi.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 420px) 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>Odbiorcy</h3>

              <button
                className="btn"
                onClick={loadContacts}
                disabled={loadingContacts || sending}
              >
                Odśwież
              </button>
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj kontaktu lub maila"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 12,
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={selectAllFiltered}
                disabled={loadingContacts || sending || filteredContacts.length === 0}
              >
                Zaznacz widoczne
              </button>

              <button
                className="btn"
                onClick={clearSelection}
                disabled={sending || selectedEmails.length === 0}
              >
                Wyczyść wybór
              </button>
            </div>

            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
              Wybrano: <strong>{selectedContacts.length}</strong>
            </div>

            <div
              style={{
                maxHeight: 420,
                overflowY: 'auto',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              {loadingContacts && (
                <div style={{ padding: 12 }}>
                  Ładowanie kontaktów...
                </div>
              )}

              {!loadingContacts && filteredContacts.length === 0 && (
                <div style={{ padding: 12, color: '#64748b' }}>
                  Brak kontaktów z adresem e-mail.
                </div>
              )}

              {!loadingContacts &&
                filteredContacts.map((contact) => (
                  <label
                    key={contact.email}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '12px 0',
                      borderBottom: '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected(contact.email)}
                      onChange={() => toggleContact(contact.email)}
                      disabled={sending}
                      style={{ marginTop: 3 }}
                    />

                    <div>
                      <strong>{contact.name}</strong>

                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        {contact.email}
                      </div>

                      {contact.phone && (
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          {contact.phone}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
            </div>
          </div>

          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Treść wiadomości</h3>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Tytuł wiadomości
              </label>

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Np. Informacja o spotkaniu"
                disabled={sending}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Treść maila
              </label>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Wpisz treść wiadomości..."
                disabled={sending}
                rows={12}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 12,
                marginBottom: 14,
                fontSize: 13,
                color: '#475569',
              }}
            >
              Pamiętaj, aby zweryfikować treść wiadomości przed wysyłką. System nie umożliwia edycji po wysłaniu.
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSend}
              disabled={sending || loadingContacts}
            >
              {sending ? 'Wysyłanie...' : `Wyślij wiadomość (${selectedContacts.length})`}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Integrations;