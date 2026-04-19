import React from 'react';
 
import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar';
 
import './assets/layout.scss';
 
const ProtectedLayout: React.FC = () => {
 
  return (
    <div className="app-wrapper">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
 
export default ProtectedLayout;
