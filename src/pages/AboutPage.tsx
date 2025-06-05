// src/pages/AboutPage.tsx
import React from 'react';

const AboutPage: React.FC = () => {
    return (
        <section className="AboutPage container">
            <h2>About FootWork</h2>
            <p>
                FootWork Co. was founded with one mission in mind: to help foot
                doctors and clinics provide perfectly custom orthotics to their
                patients—without the guesswork. Our online platform allows medical
                professionals and patients alike to specify exact dimensions, materials,
                and colors, and see a live preview of their insole design. Behind the
                scenes, our expert technicians ensure every insole is produced with
                medical‐grade materials and strict quality checks.
            </p>
            <p>
                Whether you’re a podiatrist in a busy clinic or an individual seeking
                relief from foot pain, FootWork Co. provides an intuitive, modern
                interface to get your custom orthotic delivered quickly. We partner
                with certified labs, maintain clinical accuracy, and strive to make
                every step you take more comfortable.
            </p>
        </section>
    );
};

export default AboutPage;
