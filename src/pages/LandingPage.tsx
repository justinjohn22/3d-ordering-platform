import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <section className="Landing-hero dark-hero">
            <div className="Hero-content">
                <h1 className="Hero-title">Custom Made just got better.</h1>
                <p className="Hero-subtitle">
                    3D printing unleashes the full capability of Footwork’s in-house
                    orthotic design software. Combined with state-of-the-art 3D printing
                    technology and premium materials, we deliver a new benchmark in custom
                    orthotic manufacturing.
                </p>

                <div className="Hero-buttons">
                    <button
                        className="btn-outline"
                        onClick={() => window.open('https://www.footwork.com.au/story', '_blank')}
                    >
                        Read Full Story Here
                    </button>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/order')}
                    >
                        Place Order
                    </button>
                </div>

                <div className="DiscoverVertical">
                    <span>DISCOVER FOOTWORK</span>
                    <span className="arrow-down">↓</span>
                </div>
            </div>

            <div className="Hero-image">
                <div className="ImagePanel">
                    {/* Static slide background */}
                    <img
                        src="https://www.footwork.com.au/wp-content/uploads/2025/03/slide1bg-1.webp"
                        alt="Custom Orthotic Design"
                    />
                    {/* Rotating insole sprite */}
                    <div className="InsoleAnim" />
                </div>
                <div className="Blob blob-top" />
                <div className="Blob blob-bottom" />
            </div>
        </section>
    );
};

export default LandingPage;