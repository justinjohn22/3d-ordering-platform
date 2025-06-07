import React, { useState } from 'react';
import { NavLink, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import OrderPage from './pages/OrderPage';
import AboutPage from './pages/AboutPage';
import './App.css';

const App: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMenu = () => setMobileOpen(o => !o);
  const closeMenu = () => mobileOpen && setMobileOpen(false);

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Order', to: '/order' },
    { label: 'About', to: '/about' }
  ];

  return (
    <div className="App">
      <header className="NavBar">
        <div className="NavBar-logo">
          <img
            src="https://www.footwork.com.au/wp-content/uploads/2024/11/header-logo.png"
            alt="FootWork Logo"
          />
        </div>

        <nav className={`NavBar-links ${mobileOpen ? 'mobile-open' : ''}`}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'NavLink active' : 'NavLink'}
              onClick={closeMenu}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="ClientBtn"
          onClick={() => window.open('https://www.footwork.com.au/client-centre-online-orders/', '_blank')}
        >
          Client Centre
        </button>

        <button
          className={`Hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </header>

      <main className="MainContent">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>

      <footer className="Footer">
        © {new Date().getFullYear()} FootWork Co. All rights reserved.
      </footer>
    </div>
  );
};

export default App;