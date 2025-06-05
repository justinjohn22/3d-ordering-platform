// src/pages/LandingPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <section className="Landing container">
            <div className="Landing-hero">
                <h1>Welcome to FootWork</h1>
                <p>
                    FootWork Co. is an online insole‐ordering platform that visualizes your
                    custom order live, aiming to improve mobility and comfort for patients
                    of foot doctors and clinics. Place your order, see it come to life, and
                    let us help you walk better.
                </p>
                <button onClick={() => navigate('/order')}>
                    Get Started
                </button>
            </div>
        </section>
    );
};

export default LandingPage;
