import axiosInstance from '../utils/axiosInstance';

export const getIntegrationSettings = async () => {
  const res = await axiosInstance.get('/integration-settings-list');
  return res.data;
};

export const saveIntegrationSettings = async (payload: any) => {
  const res = await axiosInstance.post('/integration-settings-list', { data: payload });
  return res.data;
};

export const getFunnels = async () => {
  const res = await axiosInstance.get('/funnels');
  return res.data;
};

export const getFunnel = async (id: string) => {
  try {
    const res = await axiosInstance.get(`/funnels/${id}`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const res2 = await axiosInstance.get('/funnels', { params: { 'filters[documentId][$eq]': id } });
      const out = res2.data;
      if (out && out.data && Array.isArray(out.data) && out.data.length) return out.data[0];
      if (Array.isArray(out) && out.length) return out[0];
      return out;
    }
    throw err;
  }
};

export const saveFunnel = async (payload: any, id?: string) => {
  if (id) {
    try {
      const res = await axiosInstance.put(`/funnels/${id}`, { data: payload });
      return res.data;
    } catch (err: any) {
      
      if (err?.response?.status === 404) {
        const found = await axiosInstance.get('/funnels', { params: { 'filters[documentId][$eq]': id } });
        const out = found.data;
        let record: any = null;
        if (out && out.data && Array.isArray(out.data) && out.data.length) record = out.data[0];
        else if (Array.isArray(out) && out.length) record = out[0];
        if (record && (record.id || record._id)) {
          const realId = record.id || record._id;
          const res2 = await axiosInstance.put(`/funnels/${realId}`, { data: payload });
          return res2.data;
        }
      }
      throw err;
    }
  }
  const res = await axiosInstance.post('/funnels', { data: payload });
  return res.data;
};

export const deleteFunnel = async (id: string) => {
  try {
    const res = await axiosInstance.delete(`/funnels/${id}`);
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      const found = await axiosInstance.get('/funnels', { params: { 'filters[documentId][$eq]': id } });
      const out = found.data;
      let record: any = null;
      if (out && out.data && Array.isArray(out.data) && out.data.length) record = out.data[0];
      else if (Array.isArray(out) && out.length) record = out[0];
      if (record && (record.id || record._id)) {
        const realId = record.id || record._id;
        const res2 = await axiosInstance.delete(`/funnels/${realId}`);
        return res2.data;
      }
    }
    throw err;
  }
};

export const getCourses = async () => {
  const res = await axiosInstance.get('/courses');
  return res.data;
};

export const createPurchase = async (payload: any) => {
  try {
    const params = { ['filters[userId][$eq]']: payload.userId, ['filters[courseId][$eq]']: payload.courseId } as any;
    const existing = await axiosInstance.get('/purchases', { params });
    const out = existing.data;
    if (out && out.data && Array.isArray(out.data) && out.data.length) return out.data[0];
  } catch (e) {}
  const postData: any = { ...payload };
  if (payload.userId !== undefined) postData.userId = String(payload.userId);
  if (payload.courseId !== undefined) postData.courseId = String(payload.courseId);
  if (payload.userId && !isNaN(Number(payload.userId))) postData.user = Number(payload.userId);
  if (payload.courseId && !isNaN(Number(payload.courseId))) postData.course = Number(payload.courseId);
  const res = await axiosInstance.post('/purchases', { data: postData });
  try {
    if (res && res.data && res.data.data) return res.data.data;
    if (res && res.data) return res.data;
  } catch (e) {}

  try {
    const params = { ['filters[userId][$eq]']: payload.userId, ['filters[courseId][$eq]']: payload.courseId } as any;
    const existing = await axiosInstance.get('/purchases', { params });
    const out = existing.data;
    if (out && out.data && Array.isArray(out.data) && out.data.length) return out.data[0];
  } catch (e) {}

  return res.data;
};

export const getPurchases = async (params?: any) => {
  const res = await axiosInstance.get('/purchases', { params });
  return res.data;
};

export const saveProgress = async (payload: any) => {
  try {
    const params = { ['filters[userId][$eq]']: payload.userId, ['filters[courseId][$eq]']: payload.courseId } as any;
    const existing = await axiosInstance.get('/course-progresses', { params });
    const out = existing.data;
    if (out && out.data && Array.isArray(out.data) && out.data.length) {
      const rec = out.data[0];
      const id = rec.id || rec._id;
      if (id) {
        const putData: any = { ...payload };
        if (payload.userId && !isNaN(Number(payload.userId))) putData.user = Number(payload.userId);
        if (payload.courseId && !isNaN(Number(payload.courseId))) putData.course = Number(payload.courseId);
        const updated = await axiosInstance.put(`/course-progresses/${id}`, { data: putData });
        return updated.data;
      }
    }
  } catch (e) {}
    const postData: any = { ...payload };
    if (payload.userId && !isNaN(Number(payload.userId))) postData.user = Number(payload.userId);
    if (payload.courseId && !isNaN(Number(payload.courseId))) postData.course = Number(payload.courseId);
    const res = await axiosInstance.post('/course-progresses', { data: postData });
    return res.data;
};

export const getProgress = async (params?: any) => {
  const res = await axiosInstance.get('/course-progresses', { params });
  return res.data;
};

/* Events (calendar) helpers */
export const getEvents = async (params?: any) => {
  const res = await axiosInstance.get('/kalendarze', { params });
  return res.data;
};

export const createEvent = async (payload: any) => {
  const postData: any = { ...payload };
  const errors: any[] = [];
  // Try standard POST with data wrapper
  try {
    const res = await axiosInstance.post('/kalendarze', { data: postData });
    const result = res && res.data ? res.data : res;
    try { await createLog({ action: 'create_event', message: 'Created event', meta: { title: payload.title, id: result?.data?.id || result?.id } }); } catch (e) {}
    return result;
  } catch (err: any) {
    errors.push(err?.response?.data || err?.message || err);
  }

  // Try plain body
  try {
    const r2 = await axiosInstance.post('/kalendarze', postData);
    const result = r2 && r2.data ? r2.data : r2;
    try { await createLog({ action: 'create_event', message: 'Created event (plain body)', meta: { title: payload.title, id: result?.data?.id || result?.id } }); } catch (e) {}
    return result;
  } catch (err: any) {
    errors.push(err?.response?.data || err?.message || err);
  }

  // Try attributes wrapper
  try {
    const r3 = await axiosInstance.post('/kalendarze', { data: { attributes: postData } });
    const result = r3 && r3.data ? r3.data : r3;
    try { await createLog({ action: 'create_event', message: 'Created event (attributes wrapper)', meta: { title: payload.title, id: result?.data?.id || result?.id } }); } catch (e) {}
    return result;
  } catch (err: any) {
    errors.push(err?.response?.data || err?.message || err);
  }

  const errMsg = errors.map((x: any) => typeof x === 'string' ? x : JSON.stringify(x)).join('\n---\n');
  const out: any = new Error('Create event failed: ' + errMsg);
  out.details = errors;
  try { await createLog({ action: 'create_event_failed', message: 'Create event failed', meta: { title: payload.title, errors: out.details } }); } catch (e) {}
  throw out;
};

export const updateEvent = async (id: string, payload: any) => {
  const errors: any[] = [];
  // Try PUT with data wrapper
  try {
    const res = await axiosInstance.put(`/kalendarze/${id}`, { data: payload });
    const result = res && res.data ? res.data : res;
    try { await createLog({ action: 'update_event', message: 'Updated event', meta: { id, title: payload.title } }); } catch (e) {}
    return result;
  } catch (e: any) { errors.push(e?.response?.data || e?.message || e); }

  // Try simple PUT body
  try {
    const r2 = await axiosInstance.put(`/kalendarze/${id}`, payload);
    const result = r2 && r2.data ? r2.data : r2;
    try { await createLog({ action: 'update_event', message: 'Updated event (plain body)', meta: { id, title: payload.title } }); } catch (e) {}
    return result;
  } catch (e: any) { errors.push(e?.response?.data || e?.message || e); }

  // Fallback: find by documentId and update
  try {
    const found = await axiosInstance.get('/kalendarze', { params: { ['filters[documentId][$eq]']: id } });
    const out = found.data;
    let record: any = null;
    if (out && out.data && Array.isArray(out.data) && out.data.length) record = out.data[0];
    else if (Array.isArray(out) && out.length) record = out[0];
    if (record && (record.id || record._id)) {
      const realId = record.id || record._id;
      const res2 = await axiosInstance.put(`/kalendarze/${realId}`, { data: payload });
      const result = res2 && res2.data ? res2.data : res2;
      try { await createLog({ action: 'update_event', message: 'Updated event (found by documentId)', meta: { id: realId, title: payload.title } }); } catch (e) {}
      return result;
    }
  } catch (e: any) { errors.push(e?.response?.data || e?.message || e); }

  const errMsg = errors.map((x: any) => typeof x === 'string' ? x : JSON.stringify(x)).join('\n---\n');
  const out: any = new Error('Update event failed: ' + errMsg);
  out.details = errors;
  try { await createLog({ action: 'update_event_failed', message: 'Update event failed', meta: { id, errors: out.details } }); } catch (e) {}
  throw out;
};

export const deleteEvent = async (id: string) => {
  const errors: any[] = [];
  try {
    const res = await axiosInstance.delete(`/kalendarze/${id}`);
    const result = res && res.data ? res.data : res;
    try { await createLog({ action: 'delete_event', message: 'Deleted event', meta: { id } }); } catch (e) {}
    return result;
  } catch (e: any) { errors.push(e?.response?.data || e?.message || e); }

  // Fallback: find by documentId
  try {
    const found = await axiosInstance.get('/kalendarze', { params: { ['filters[documentId][$eq]']: id } });
    const out = found.data;
    let record: any = null;
    if (out && out.data && Array.isArray(out.data) && out.data.length) record = out.data[0];
    else if (Array.isArray(out) && out.length) record = out[0];
    if (record && (record.id || record._id)) {
      const realId = record.id || record._id;
      const res2 = await axiosInstance.delete(`/kalendarze/${realId}`);
      const result = res2 && res2.data ? res2.data : res2;
      try { await createLog({ action: 'delete_event', message: 'Deleted event (found by documentId)', meta: { id: realId } }); } catch (e) {}
      return result;
    }
  } catch (e: any) { errors.push(e?.response?.data || e?.message || e); }

  const errMsg = errors.map((x: any) => typeof x === 'string' ? x : JSON.stringify(x)).join('\n---\n');
  const out: any = new Error('Delete event failed: ' + errMsg);
  out.details = errors;
  try { await createLog({ action: 'delete_event_failed', message: 'Delete event failed', meta: { id, errors: out.details } }); } catch (e) {}
  throw out;
};

export const createLog = async (payload: any) => {
  const postData: any = {
    type: payload.type || payload.action || 'log',
    userId: payload.userId || null,
    payload: payload.payload || payload.meta || payload || {},
  };
  try {
    const res = await axiosInstance.post('/action-logs', { data: postData });
    return res.data;
  } catch (err: any) {
    // try plain body
    try {
      const r2 = await axiosInstance.post('/action-logs', postData);
      return r2.data;
    } catch (e: any) {
      // swallow log errors - logging should not break main flows
      // but surface the error to console for debugging
      // eslint-disable-next-line no-console
      console.warn('createLog failed', err, e?.response || e?.message || e);
      return null;
    }
  }
};

/* Documents helpers */
// uploadMedia is defined later in this file (shared helper)

export const getDocuments = async (params?: any) => {
  const res = await axiosInstance.get('/documents', { params });
  return res.data;
};

export const createDocument = async (payload: any) => {
  const res = await axiosInstance.post('/documents', { data: payload });
  return res.data;
};

export const updateDocument = async (id: string, payload: any) => {
  const res = await axiosInstance.put(`/documents/${id}`, { data: payload });
  return res.data;
};

export const deleteDocument = async (id: string) => {
  try {
    const res = await axiosInstance.delete(`/documents/${id}`);
    console.info('deleteDocument: status', res.status, res.data);
    return res.data;
  } catch (err: any) {
    // fallback: try finding by filters or swallow
    try {
      const found = await axiosInstance.get('/documents', { params: { ['filters[id][$eq]']: id } });
      const out = found.data;
      let record: any = null;
      if (out && out.data && Array.isArray(out.data) && out.data.length) record = out.data[0];
      else if (Array.isArray(out) && out.length) record = out[0];
      if (record && (record.id || record._id)) {
        const realId = record.id || record._id;
        const res2 = await axiosInstance.delete(`/documents/${realId}`);
        return res2.data;
      }
    } catch (e) {
      // ignore
    }
    throw err;
  }
};


/* CRM contacts helpers */
// Allow auto-detection of CRM resource (prefer `contacts` if available).
let CRM_RESOURCE: string | null = null;

export const setCRMResource = (res: string | null) => { CRM_RESOURCE = res; };

const detectCRMResource = async (): Promise<string> => {
  if (CRM_RESOURCE) return CRM_RESOURCE;
  const candidates = ['contacts', 'projects', 'leads'];
  for (const c of candidates) {
    try {
      const res = await axiosInstance.get(`/${c}`, { params: { 'pagination[pageSize]': 1 } });
      if (res && (res.status === 200 || res.status === 204 || res.data)) {
        CRM_RESOURCE = c;
        console.info(`CRM resource detected: /${c}`);
        return c;
      }
    } catch (e) {
      // continue
    }
  }
  // default to contacts if nothing detected
  CRM_RESOURCE = 'contacts';
  return CRM_RESOURCE;
};

const crmUrl = (path: string) => `/${path}`;

export const getContacts = async (params?: any) => {
  const resource = await detectCRMResource();
  const res = await axiosInstance.get(crmUrl(resource), { params });
  return res.data;
};

const mapPayloadForResource = (resource: string, payload: any) => {
  if (!payload) return payload;
  // default: payload as-is
  if (resource === 'projects') {
    // many Strapi installs use 'name'/'description' instead of 'title'
    return {
      name: payload.name || payload.title || 'Untitled',
      description: payload.notes || payload.description || '',
      email: payload.email,
      phone: payload.phone,
      tags: payload.tags,
    };
  }
  if (resource === 'leads') {
    return {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      notes: payload.notes,
    };
  }
  if (resource === 'contacts') {
    // Map frontend contact shape to the Strapi `contacts` fields
    const out: any = {
      firstName: payload.firstName || payload.name || payload.title || '',
      lastName: payload.lastName || '',
      phone: payload.phone || '',
      email: payload.email || '',
      notes: payload.notes || payload.description || '',
      todos: payload.todos || [],
    };
    // include uploaded avatar id when available, or pass through avatar URL as fallback
    if (payload._uploadedAvatar && payload._uploadedAvatar.id) out.avatar = payload._uploadedAvatar.id;
    else if (payload.avatar) out.avatar = payload.avatar;
    return out;
  }
  return payload;
};

export const createContact = async (payload: any) => {
  const resource = await detectCRMResource();
  const mapped = mapPayloadForResource(resource, payload);
  try {
    const res = await axiosInstance.post(crmUrl(resource), { data: mapped });
    return res.data;
  } catch (err: any) {
    // Try fallbacks for different Strapi shapes
    const errors: any[] = [];
    errors.push(err?.response?.data || err?.message || err);
    if (err?.response?.status === 400 || err?.response?.status === 405) {
      try {
        // try plain body
        const r2 = await axiosInstance.post(crmUrl(resource), mapped);
        return r2.data;
      } catch (e2: any) {
        errors.push(e2?.response?.data || e2?.message || e2);
      }

      try {
        // try attributes wrapper
        const r3 = await axiosInstance.post(crmUrl(resource), { data: { attributes: mapped } });
        return r3.data;
      } catch (e3: any) {
        errors.push(e3?.response?.data || e3?.message || e3);
      }
    }
    console.warn(`Create to /${resource} failed (attempted multiple shapes):`, errors);
    const errMsg = errors.map((x: any) => typeof x === 'string' ? x : JSON.stringify(x)).join('\n---\n');
    const out: any = new Error('Create failed: ' + errMsg);
    out.details = errors;
    throw out;
  }
};

export const updateContact = async (id: string, payload: any) => {
  const resource = await detectCRMResource();
  try {
    const mapped = mapPayloadForResource(resource, payload);
    const res = await axiosInstance.put(`${crmUrl(resource)}/${id}`, { data: mapped });
    return res.data;
  } catch (err: any) {
    // attempt fallback by searching list for matching record id
    const found = await axiosInstance.get(crmUrl(resource), { params: { ['filters[documentId][$eq]']: id } });
    const out = found.data;
    let record: any = null;
    if (out && out.data && Array.isArray(out.data) && out.data.length) record = out.data[0];
    else if (Array.isArray(out) && out.length) record = out[0];
    if (record && (record.id || record._id)) {
      const realId = record.id || record._id;
      const res2 = await axiosInstance.put(`${crmUrl(resource)}/${realId}`, { data: payload });
      return res2.data;
    }
    throw err;
  }
};

export const deleteContact = async (id: string) => {
  const resource = await detectCRMResource();
  try {
    const res = await axiosInstance.delete(`${crmUrl(resource)}/${id}`);
    return res.data;
  } catch (err: any) {
    const found = await axiosInstance.get(crmUrl(resource), { params: { ['filters[documentId][$eq]']: id } });
    const out = found.data;
    let record: any = null;
    if (out && out.data && Array.isArray(out.data) && out.data.length) record = out.data[0];
    else if (Array.isArray(out) && out.length) record = out[0];
    if (record && (record.id || record._id)) {
      const realId = record.id || record._id;
      const res2 = await axiosInstance.delete(`${crmUrl(resource)}/${realId}`);
      return res2.data;
    }
    throw err;
  }
};

export const uploadMedia = async (file: File) => {
  const fd = new FormData();
  fd.append('files', file);
  // Strapi upload endpoint (v4) typically at /upload
  const res = await axiosInstance.post('/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getLogs = async (params?: any) => {
  const res = await axiosInstance.get('/action-logs', { params });
  return res.data;
};

export default {
  getIntegrationSettings,
  saveIntegrationSettings,
  getFunnels,
  getFunnel,
  saveFunnel,
  deleteFunnel,
  uploadMedia,
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  createLog,
  getLogs,
};
