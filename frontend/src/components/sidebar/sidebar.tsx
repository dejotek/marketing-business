import React from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faHome, faBox, faUser, faCogs, faSignOutAlt, faComments, faBookOpen, faFileAlt, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

import { useNavigate } from 'react-router-dom';

const Sidebar = () => {

  const navigate = useNavigate();

  const doLogout = () => {
        navigate('/login');
  };

  return (
    <div className={`sidebar open`}>
      <div className="sidebar-header">
        <img src="/logo.png" alt="Logo" className="sidebar-logo" />
      </div>

      <ul className="menu-list">
        <li>
          <NavLink to="/app/dashboard" className={({isActive}) => `menu-link${isActive ? ' active' : ''}`}>
            <FontAwesomeIcon icon={faHome} />
            <span>Start</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/app/crm" className={({isActive}) => `menu-link${isActive ? ' active' : ''}`}>
            <FontAwesomeIcon icon={faBox} />
            <span>CRM</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/app/funnels/list" className={({isActive}) => `menu-link${isActive ? ' active' : ''}`}>
            <FontAwesomeIcon icon={faBox} />
            <span>Lejki</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/app/integrations" className={({isActive}) => `menu-link${isActive ? ' active' : ''}`}>
            <FontAwesomeIcon icon={faComments} />
            <span>Komunikacja</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/app/courses" className={({isActive}) => `menu-link${isActive ? ' active' : ''}`}>
            <FontAwesomeIcon icon={faBookOpen} />
            <span>Kursy</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/app/documents" className={({isActive}) => `menu-link${isActive ? ' active' : ''}`}>
            <FontAwesomeIcon icon={faFileAlt} />
            <span>Dokumenty</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/app/calendar" className={({isActive}) => `menu-link${isActive ? ' active' : ''}`}>
            <FontAwesomeIcon icon={faCalendarAlt} />
            <span>Kalendarz</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/app/integrations" className={({isActive}) => `menu-link${isActive ? ' active' : ''}`}>
            <FontAwesomeIcon icon={faCogs} />
            <span>Ustawienia</span>
          </NavLink>
        </li>
      </ul>

      <button className="logout-btn btn btn-ghost" onClick={doLogout}>
        <FontAwesomeIcon icon={faSignOutAlt} />
        <span>Wyloguj się</span>
      </button>
    </div>
  );
};

export default Sidebar;
