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
 
export const createLog = async (payload: any) => {
  const res = await axiosInstance.post('/action-logs', { data: payload });
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
};
