// src/pages/OrderPage.tsx

import React, { useState, ChangeEvent, FormEvent, useMemo } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import {
    Mesh,
    MeshStandardMaterial,
    AmbientLight,
    DirectionalLight,
    ExtrudeGeometry,
    ExtrudeGeometryOptions,
    Shape,
} from 'three';

// ────────────────────────────────────────────────────────────
// Register Three.js primitives so that JSX <mesh />, <meshStandardMaterial />,
// <ambientLight />, and <directionalLight /> work within R3F.
// ────────────────────────────────────────────────────────────
extend({
    Mesh,
    MeshStandardMaterial,
    AmbientLight,
    DirectionalLight,
});

// ────────────────────────────────────────────────────────────
// Type Definitions for Form & Orthotic Parameters
// ────────────────────────────────────────────────────────────
type WidthOption = 'Narrow' | 'Medium' | 'Wide';
type ThicknessOption = 'Thin' | 'Thick';
type ColourOption = 'Black' | 'Grey' | 'Blue' | 'Red';

interface OrderData {
    firstName: string;
    lastName: string;
    email: string;
    shoeType: string;
    shoeSize: string;
    lengthVal: number;
    widthVal: WidthOption;
    thicknessVal: ThicknessOption;
    colourVal: ColourOption;
}

// ────────────────────────────────────────────────────────────
// Utility: Compute Bézier‐Curve Insole Geometry
//
// Defines a 2D `THREE.Shape` using Bézier segments, then extrudes it
// by `thickness` to produce an `ExtrudeGeometry`. Anchors are at:
// – heel (Z=0), arch (Z≈40%), ball (Z≈70%), toe tip (Z=100%).  
// Uses symmetric control points so that left and right edges match.
//
// If `realistic === false`, returns a flat extrude of uniform depth.
// If `realistic === true`, after extruding:
//   • Modifies top‐face vertices so they form a basic arch‐support profile:
//       - Heel thicker → Arch thickest → Forefoot thinner → Toe thinnest.
//   • Carves a shallow heel cup under the heel (center lower than edges).
//   • Tapers to near‐zero at the very front (toe region) for a slight upturn.
// ────────────────────────────────────────────────────────────
function computeInsoleGeometry(params: {
    width: number;
    length: number;
    thickness: number;
    realistic: boolean;
}): ExtrudeGeometry {
    const { width, length, thickness, realistic } = params;
    const halfWidth = width / 2;

    // 1. Define anchor points on X–Z plane for the outline
    //    Heel center, arch point, ball point, toe tip
    const heel = { x: 0, z: 0 };
    const arch = { x: -halfWidth * 0.3, z: length * 0.4 };
    const ball = { x: halfWidth * 0.5, z: length * 0.7 };
    const toe = { x: 0, z: length };

    // 2. Build a 2D shape via Bézier segments
    const shape = new Shape();
    shape.moveTo(heel.x, heel.z);

    // Heel → Arch
    shape.bezierCurveTo(
        -halfWidth * 0.1, length * 0.1,
        -halfWidth * 0.3, length * 0.3,
        arch.x, arch.z
    );

    // Arch → Ball
    shape.bezierCurveTo(
        -halfWidth * 0.5, length * 0.5,
        halfWidth * 0.5, length * 0.6,
        ball.x, ball.z
    );

    // Ball → Toe
    shape.bezierCurveTo(
        halfWidth * 0.5, length * 0.8,
        halfWidth * 0.2, length * 0.9,
        toe.x, toe.z
    );

    // Toe → Opposite Ball (mirror X)
    shape.bezierCurveTo(
        -halfWidth * 0.2, length * 0.9,
        -halfWidth * 0.5, length * 0.8,
        -ball.x, ball.z
    );

    // Opposite Ball → Opposite Arch
    shape.bezierCurveTo(
        -halfWidth * 0.5, length * 0.6,
        halfWidth * 0.5, length * 0.5,
        -arch.x, arch.z
    );

    // Opposite Arch → Heel
    shape.bezierCurveTo(
        halfWidth * 0.3, length * 0.3,
        halfWidth * 0.1, length * 0.1,
        heel.x, heel.z
    );

    // 3. Extrude to a uniform depth = `thickness`
    const extrudeSettings: ExtrudeGeometryOptions = {
        depth: thickness,
        bevelEnabled: false,
        steps: 1,
    };
    const geom = new ExtrudeGeometry(shape, extrudeSettings);

    if (realistic) {
        // 4. Modify only the top‐face vertices (those initially at Y = thickness)
        const posAttr = geom.attributes.position as THREE.BufferAttribute;
        const vertexCount = posAttr.count;

        // Precompute some thickness‐profile values:
        //   Heel ~ 80% of thickness, Arch = 100%, Forefoot = 60%, Toe = 20%
        // These can be tuned if desired.
        const heelThick = thickness * 0.8;
        const archThick = thickness * 1.0;
        const foreThick = thickness * 0.6;
        const toeThick = thickness * 0.2;
        // Depth of heel cup (how much lower to push center)
        const heelCupDepth = thickness * 0.10;

        for (let i = 0; i < vertexCount; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const z = posAttr.getZ(i);

            // Only sculpt the top face (y ≈ thickness)
            if (Math.abs(y - thickness) < 1e-6) {
                // 4a. Compute normalized length parameter t = z / length
                const t = THREE.MathUtils.clamp(z / length, 0, 1);

                // 4b. Piecewise interpolate thickness profile along length:
                let targetY: number;
                if (t < 0.3) {
                    // Heel → Arch
                    targetY = THREE.MathUtils.lerp(heelThick, archThick, t / 0.3);
                } else if (t < 0.7) {
                    // Arch → Forefoot
                    targetY = THREE.MathUtils.lerp(archThick, foreThick, (t - 0.3) / 0.4);
                } else {
                    // Forefoot → Toe
                    targetY = THREE.MathUtils.lerp(foreThick, toeThick, (t - 0.7) / 0.3);
                }

                // 4c. Apply a heel cup if in heel region (t < 0.15):
                if (t < 0.15) {
                    // Factor = 1 at center (x=0), 0 at edges (|x|=halfWidth)
                    const factor = 1 - Math.min(Math.abs(x) / halfWidth, 1);
                    targetY -= heelCupDepth * factor;
                }

                // 4d. Write the modified Y
                posAttr.setY(i, targetY);
            }
        }

        posAttr.needsUpdate = true;
        geom.computeVertexNormals(); // Recompute normals so lighting looks correct
    }

    return geom;
}

// ────────────────────────────────────────────────────────────
// React Component: InsoleMesh
//
// • Memoizes geometry so it isn’t recomputed on every render.
// • Uses useFrame to apply a gentle rotation for inspection.
// • Accepts an additional `realistic` prop to turn contoured mode on/off.
// ────────────────────────────────────────────────────────────
interface InsoleMeshProps {
    width3D: number;
    length3D: number;
    thickness3D: number;
    colorHex: string;
    realistic: boolean;
}

const InsoleMesh: React.FC<InsoleMeshProps> = ({
    width3D,
    length3D,
    thickness3D,
    colorHex,
    realistic,
}) => {
    // Memoize the extruded‐and‐sculpted geometry; recalc only when dims/flag change
    const geometry = useMemo(() => {
        return computeInsoleGeometry({
            width: width3D,
            length: length3D,
            thickness: thickness3D,
            realistic,
        });
    }, [width3D, length3D, thickness3D, realistic]);

    // Rotate the entire scene slowly so user can inspect
    useFrame((state, delta) => {
        state.scene.rotation.y += delta * 0.05; // 0.05 rad/sec
    });

    return (
        <mesh geometry={geometry}>
            <meshStandardMaterial color={colorHex} />
        </mesh>
    );
};

// ────────────────────────────────────────────────────────────
// Main Page: OrderPage
// ────────────────────────────────────────────────────────────
const OrderPage: React.FC = () => {
    // 1. Form-state
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [shoeType, setShoeType] = useState<string>('');
    const [shoeSize, setShoeSize] = useState<string>('');

    // 2. Recent Submissions (typed as OrderData[])
    const [recentSubmissions, setRecentSubmissions] = useState<OrderData[]>([]);

    // 3. Orthotic options
    const [lengthVal, setLengthVal] = useState<number>(50);
    const [widthVal, setWidthVal] = useState<WidthOption>('Medium');
    const [thicknessVal, setThicknessVal] = useState<ThicknessOption>('Thin');
    const [colourVal, setColourVal] = useState<ColourOption>('Black');

    // 4. “Realistic Insole” toggle
    const [realistic, setRealistic] = useState<boolean>(false);

    // 5. Handle form submission
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const orderData: OrderData = {
            firstName,
            lastName,
            email,
            shoeType,
            shoeSize,
            lengthVal,
            widthVal,
            thicknessVal,
            colourVal,
        };

        console.log('Order placed:', orderData);
        alert('Thank you, your order has been recorded!');

        // Keep only the last 5 submissions
        setRecentSubmissions(prev => [orderData, ...prev].slice(0, 5));

        // Reset form fields
        setFirstName('');
        setLastName('');
        setEmail('');
        setShoeType('');
        setShoeSize('');
        setLengthVal(50);
        setWidthVal('Medium');
        setThicknessVal('Thin');
        setColourVal('Black');
    };

    // 6. Compute 3D parameters for the insole preview
    const computePreviewParams = () => {
        // Map widthVal → X dimension (Narrow=0.75, Medium=1, Wide=1.25)
        let width3D = 1;
        if (widthVal === 'Narrow') width3D = 0.75;
        else if (widthVal === 'Wide') width3D = 1.25;

        // Map lengthVal (0–100) → Z dimension (1.0–2.5)
        const length3D = 1 + (lengthVal / 100) * 1.5;

        // Map thicknessVal → Y dimension (Thin=0.2, Thick=0.4)
        const thickness3D = thicknessVal === 'Thick' ? 0.4 : 0.2;

        // Map colourVal → hex code
        let colorHex = '#000000';
        if (colourVal === 'Grey') colorHex = '#777777';
        else if (colourVal === 'Blue') colorHex = '#1E90FF';
        else if (colourVal === 'Red') colorHex = '#DC143C';

        return {
            dimensions: [width3D, thickness3D, length3D] as [number, number, number],
            color: colorHex,
        };
    };

    // Extract computed 3D parameters
    const { dimensions, color } = computePreviewParams();
    const [width3D, thickness3D, length3D] = dimensions;

    return (
        <section className="OrderPage container">
            <h2>Custom Orthotic Order</h2>

            <form className="OrderForm" onSubmit={handleSubmit}>
                {/* First Name */}
                <div>
                    <label htmlFor="firstName">First Name *</label>
                    <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                        required
                    />
                </div>

                {/* Last Name */}
                <div>
                    <label htmlFor="lastName">Last Name *</label>
                    <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                        required
                    />
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email">Email Address *</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        required
                    />
                </div>

                {/* Shoe Type */}
                <div>
                    <label htmlFor="shoeType">Shoe Type</label>
                    <input
                        id="shoeType"
                        type="text"
                        placeholder="e.g. Running, Dress, etc."
                        value={shoeType}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setShoeType(e.target.value)}
                    />
                </div>

                {/* Shoe Size */}
                <div>
                    <label htmlFor="shoeSize">Shoe Size</label>
                    <input
                        id="shoeSize"
                        type="text"
                        placeholder="e.g. 9, 42EU, etc."
                        value={shoeSize}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setShoeSize(e.target.value)}
                    />
                </div>

                {/* Length slider (0–100) */}
                <div className="FullSpan">
                    <label htmlFor="lengthVal">
                        Length:{' '}
                        {lengthVal < 25 ? 'Short' : lengthVal > 75 ? 'Long' : 'Medium'} ({lengthVal})
                    </label>
                    <input
                        id="lengthVal"
                        type="range"
                        min="0"
                        max="100"
                        value={lengthVal}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setLengthVal(Number(e.target.value))}
                    />
                </div>

                {/* Width select */}
                <div>
                    <label htmlFor="widthVal">Width *</label>
                    <select
                        id="widthVal"
                        value={widthVal}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setWidthVal(e.target.value as WidthOption)}
                        required
                    >
                        <option value="Narrow">Narrow</option>
                        <option value="Medium">Medium</option>
                        <option value="Wide">Wide</option>
                    </select>
                </div>

                {/* Thickness select */}
                <div>
                    <label htmlFor="thicknessVal">Thickness *</label>
                    <select
                        id="thicknessVal"
                        value={thicknessVal}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setThicknessVal(e.target.value as ThicknessOption)}
                        required
                    >
                        <option value="Thin">Thin</option>
                        <option value="Thick">Thick</option>
                    </select>
                </div>

                {/* Colour select */}
                <div>
                    <label htmlFor="colourVal">Colour *</label>
                    <select
                        id="colourVal"
                        value={colourVal}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setColourVal(e.target.value as ColourOption)}
                        required
                    >
                        <option value="Black">Black</option>
                        <option value="Grey">Grey</option>
                        <option value="Blue">Blue</option>
                        <option value="Red">Red</option>
                    </select>
                </div>

                {/* Toggle: Realistic Insole */}
                <div>
                    <label htmlFor="realisticToggle">
                        <input
                            id="realisticToggle"
                            type="checkbox"
                            checked={realistic}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setRealistic(e.target.checked)}
                        />{' '}
                        Realistic Insole
                    </label>
                </div>

                {/* Submit Button */}
                <div className="FullSpan">
                    <button type="submit">Place My Order</button>
                </div>
            </form>

            {/* ──────────────────────────────────────────────────────────── */}
            {/*   Live 3D Insole Preview (Bézier + toggleable realism)     */}
            {/* ──────────────────────────────────────────────────────────── */}
            <div className="Visualization">
                <h3>Live 3D Insole Preview</h3>
                <div className="InsoleCanvasContainer debug-visible">
                    <div className="canvas-container" style={{ height: 400 }}>
                        <Canvas camera={{ position: [0, thickness3D * 2.5, length3D * 1.3] }}>
                            {/* Ambient + Directional lighting */}
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[2, 5, 5]} intensity={1} />
                            <OrbitControls enableZoom={true} />

                            {/* Render the InsoleMesh (flat or contoured based on `realistic`) */}
                            <InsoleMesh
                                width3D={width3D}
                                length3D={length3D}
                                thickness3D={thickness3D}
                                colorHex={color}
                                realistic={realistic}
                            />
                        </Canvas>
                    </div>
                </div>

                <div className="InsoleLabel" style={{ marginTop: '1em' }}>
                    Width: {widthVal}, Thickness: {thicknessVal}, Colour: {colourVal}, Length: {lengthVal}%
                    {realistic && ' (Realistic Mode On)'}
                </div>
            </div>

            {/* ─────────────────────────────────────────── */}
            {/*    Recent Submissions List (unchanged)      */}
            {/* ─────────────────────────────────────────── */}
            {recentSubmissions.length > 0 && (
                <div className="RecentSubmissions" style={{ marginTop: '2em' }}>
                    <h3>Recent Submissions</h3>
                    <ul>
                        {recentSubmissions.map((sub, idx) => (
                            <li key={idx}>
                                <strong>
                                    {sub.firstName} {sub.lastName}
                                </strong>{' '}
                                ({sub.email}) — {sub.widthVal} / {sub.thicknessVal} / {sub.colourVal}, Length: {sub.lengthVal}%
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};

export default OrderPage;
