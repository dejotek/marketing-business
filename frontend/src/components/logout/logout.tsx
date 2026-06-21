import React from 'react';

const Logout = () => {
  const handleLogout = () => {
    try {
      localStorage.removeItem('jwt');
      localStorage.removeItem('userId');
    } catch (e) {}
    window.location.href = '/login';
  };

  return <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>;
};

export default Logout;