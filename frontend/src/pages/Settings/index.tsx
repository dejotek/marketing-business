import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';

type StrapiUser = {
  id?: number | string;
  username?: string;
  email?: string;
  provider?: string;
  confirmed?: boolean;
  blocked?: boolean;
  role?: any;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

const normalizeUser = (raw: any): StrapiUser => {
  if (!raw) return {};

  if (raw.data) {
    const data = raw.data;
    const attrs = data.attributes || data;

    return {
      id: data.id || attrs.id,
      ...attrs,
    };
  }

  return raw;
};

const getErrorMessage = (err: any) => {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    'Nieznany błąd'
  );
};

const updateStoredJwt = (jwt?: string) => {
  if (!jwt) return;

  localStorage.setItem('jwt', jwt);
  localStorage.setItem('token', jwt);
  localStorage.setItem('authToken', jwt);

  axiosInstance.defaults.headers.common.Authorization = `Bearer ${jwt}`;
};

const Settings: React.FC = () => {
  const [user, setUser] = useState<StrapiUser | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const userRoleName = useMemo(() => {
    const role = user?.role;

    if (!role) return '—';

    return (
      role.name ||
      role.type ||
      role.attributes?.name ||
      role.attributes?.type ||
      '—'
    );
  }, [user]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);

    try {
      let res;

      try {
        res = await axiosInstance.get('/users/me?populate=role');
      } catch {
        res = await axiosInstance.get('/users/me');
      }

      const me = normalizeUser(res.data);

      setUser(me);
      setUsername(me.username || '');
      setEmail(me.email || '');
    } catch (err: any) {
      console.error('Błąd pobierania użytkownika:', err);
      alert(`Nie udało się pobrać danych użytkownika: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = () => {
    if (!username.trim()) {
      alert('Wpisz nazwę użytkownika.');
      return false;
    }

    if (username.trim().length < 3) {
      alert('Nazwa użytkownika musi mieć minimum 3 znaki.');
      return false;
    }

    if (!email.trim()) {
      alert('Wpisz adres e-mail.');
      return false;
    }

    if (email.trim().length < 6 || !email.includes('@')) {
      alert('Wpisz poprawny adres e-mail.');
      return false;
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      alert('Nie znaleziono ID użytkownika.');
      return;
    }

    if (!validateProfile()) return;

    setSavingProfile(true);

    try {
      const payload = {
        username: username.trim(),
        email: email.trim(),
      };

      const res = await axiosInstance.put(`/users/${user.id}`, payload);

      const updated = normalizeUser(res.data);

      setUser((prev) => ({
        ...(prev || {}),
        ...updated,
        username: payload.username,
        email: payload.email,
      }));

      alert('Dane logowania zostały zaktualizowane.');
    } catch (err: any) {
      console.error('Błąd zapisu profilu:', err);

      const message = getErrorMessage(err);

      if (err?.response?.status === 403) {
        alert(
          'Brak uprawnień do edycji użytkownika. W Strapi włącz uprawnienie update dla użytkownika albo dodaj własny endpoint do aktualizacji profilu.'
        );
        return;
      }

      alert(`Nie udało się zapisać danych: ${message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const validatePassword = () => {
    if (!currentPassword.trim()) {
      alert('Wpisz aktualne hasło.');
      return false;
    }

    if (!password.trim()) {
      alert('Wpisz nowe hasło.');
      return false;
    }

    if (password.length < 6) {
      alert('Nowe hasło musi mieć minimum 6 znaków.');
      return false;
    }

    if (password !== passwordConfirmation) {
      alert('Nowe hasło i powtórzenie hasła nie są takie same.');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;

    setSavingPassword(true);

    try {
      const res = await axiosInstance.post('/auth/change-password', {
        currentPassword,
        password,
        passwordConfirmation,
      });

      if (res?.data?.jwt) {
        updateStoredJwt(res.data.jwt);
      }

      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');

      alert('Hasło zostało zmienione.');
    } catch (err: any) {
      console.error('Błąd zmiany hasła:', err);

      const message = getErrorMessage(err);

      if (err?.response?.status === 400) {
        alert(`Nie udało się zmienić hasła: ${message}`);
        return;
      }

      alert(`Błąd zmiany hasła: ${message}`);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Ustawienia</h1>
        <div style={{ padding: 16, background: '#fff', borderRadius: 12 }}>
          Ładowanie danych użytkownika...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Ustawienia</h1>

      <p style={{ color: '#64748b', marginTop: -6 }}>
        Tutaj możesz zmienić dane logowania przypisane do aktualnie zalogowanego konta.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <section
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Dane konta</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Nazwa użytkownika
              </label>

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                disabled={savingProfile}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                }}
              />

              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Minimum 3 znaki.
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Adres e-mail
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={savingProfile}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                }}
              />

              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Ten adres służy do logowania.
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 12,
                display: 'grid',
                gap: 8,
                fontSize: 14,
              }}
            >
              <div>
                <strong>ID użytkownika:</strong> {user?.id || '—'}
              </div>

              <div>
                <strong>Provider:</strong> {user?.provider || 'local'}
              </div>

              <div>
                <strong>Rola:</strong> {userRoleName}
              </div>

              <div>
                <strong>Potwierdzone konto:</strong>{' '}
                {user?.confirmed ? 'Tak' : 'Nie'}
              </div>

              <div>
                <strong>Zablokowane konto:</strong>{' '}
                {user?.blocked ? 'Tak' : 'Nie'}
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? 'Zapisywanie...' : 'Zapisz dane konta'}
            </button>
          </div>
        </section>

        <section
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e2e8f0',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Zmiana hasła</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Aktualne hasło
              </label>

              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Wpisz aktualne hasło"
                disabled={savingPassword}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Nowe hasło
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 znaków"
                disabled={savingPassword}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Powtórz nowe hasło
              </label>

              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Powtórz nowe hasło"
                disabled={savingPassword}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                }}
              />
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                color: '#475569',
              }}
            >
              Po zmianie hasła Strapi może zwrócić nowy token JWT. Jeżeli go zwróci,
              zostanie automatycznie zapisany w przeglądarce.
            </div>

            <button
              className="btn btn-primary"
              onClick={handleChangePassword}
              disabled={savingPassword}
            >
              {savingPassword ? 'Zmienianie hasła...' : 'Zmień hasło'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;