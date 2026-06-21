export const PURCHASE_KEY_BASE = 'purchased_courses_v1_all';

export const getLocalPurchases = (uid: string) => {
  try {
    const raw = localStorage.getItem(PURCHASE_KEY_BASE) || '{}';
    const obj = JSON.parse(raw || '{}');
    return (obj[uid] && typeof obj[uid] === 'object') ? obj[uid] : {};
  } catch (e) { return {}; }
};

export const setLocalPurchase = (uid: string, courseId: string, value: boolean) => {
  try {
    const raw = localStorage.getItem(PURCHASE_KEY_BASE) || '{}';
    const obj = JSON.parse(raw || '{}');
    obj[uid] = obj[uid] || {};
    if (value) obj[uid][courseId] = true;
    else delete obj[uid][courseId];
    localStorage.setItem(PURCHASE_KEY_BASE, JSON.stringify(obj));
  } catch (e) {}
};

export const getAllForUser = getLocalPurchases;

export default { getLocalPurchases, setLocalPurchase };
