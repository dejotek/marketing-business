import React from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Login from './components/login';
import Register from './components/register';
import Dashboard from './components/dashboard';
import Logout from './components/logout';

import { isAuthenticated } from './utils/auth';
import Schedule from './components/calendar';

import CRM from './pages/CRM';
import Funnels from './pages/Funnels';
import FunnelsList from './pages/FunnelsList';
import FunnelPreview from './pages/FunnelPreview';
import FunnelPublic from './pages/FunnelPublic';
import Courses from './pages/Courses';
import CourseDetail from './pages/Courses/CourseDetail';
import Documents from './pages/Documents';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';

import ProtectedLayout from './components/Layout';

const App = () => (
  <Router>
    <Routes>
      <Route
        path="/"
        element={isAuthenticated() ? <Navigate to="/app/dashboard" /> : <Navigate to="/login" />}
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/calendar" element={<Schedule />} />

      <Route
        path="/app"
        element={isAuthenticated() ? <ProtectedLayout /> : <Navigate to="/login" />}
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="calendar" element={<Schedule />} />
        <Route path="crm" element={<CRM />} />
        <Route path="funnels" element={<Funnels />} />
        <Route path="funnels/list" element={<FunnelsList />} />
        <Route path="funnels/preview" element={<FunnelPreview />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="documents" element={<Documents />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/funnel/view" element={<FunnelPublic />} />
      <Route path="/dashboard" element={<Navigate to="/app/dashboard" />} />
      <Route path="/crm" element={<Navigate to="/app/crm" />} />
      <Route path="/documents" element={<Navigate to="/app/documents" />} />
      <Route path="/settings" element={<Navigate to="/app/settings" />} />
    </Routes>
  </Router>
);

export default App;