export const isAuthenticated = () => {
  return localStorage.getItem('jwt') !== null;
};

export const getCurrentUserId = (): string => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const user = JSON.parse(userInfo);
    return user.documentId || 'demo-user';
  }
  return 'demo-user';
};

export const setCurrentUserId = (id: string) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    const user = JSON.parse(userInfo);
    localStorage.setItem('userInfo', JSON.stringify({ ...user, documentId: id }));
  } else {
    localStorage.setItem('userInfo', JSON.stringify({ documentId: id }));
  }
};
