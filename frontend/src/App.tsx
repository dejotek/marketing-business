import React from 'react';
 
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
 
import Login from './components/login';
import Register from './components/register';
import Dashboard from './components/dashboard';
 
const App = () => (
  <Router>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </Router>
);
 
export default App;
