// src/App.tsx
import React, { useState } from 'react';
import { NavLink, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import OrderPage from './pages/OrderPage';
import AboutPage from './pages/AboutPage';

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Toggle the mobile menu open/closed
  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  // When a link is clicked, on mobile we want to close the menu
  const handleLinkClick = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="App">
      {/* Top navigation bar */}
      <nav className="NavBar container">
        {/* Logo */}
        <div className="NavBar-logo">FootWork Co.</div>

        {/* Hamburger button (visible only on mobile) */}
        <button
          className={`Hamburger ${isMenuOpen ? 'open' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          {/* Three bars */}
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>

        {/* Navigation links */}
        <ul className={`NavBar-links ${isMenuOpen ? 'mobile-open' : ''}`}>
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'NavLink active' : 'NavLink'
              }
              onClick={handleLinkClick}
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/order"
              className={({ isActive }) =>
                isActive ? 'NavLink active' : 'NavLink'
              }
              onClick={handleLinkClick}
            >
              Order
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                isActive ? 'NavLink active' : 'NavLink'
              }
              onClick={handleLinkClick}
            >
              About
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Main content area */}
      <main className="MainContent">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="Footer">
        © {new Date().getFullYear()} FootWork Co. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
