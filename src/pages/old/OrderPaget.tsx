// src/pages/OrderPage.tsx

import React, { useState, ChangeEvent, FormEvent, useMemo } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, useGLTF } from '@react-three/drei';
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
// Utility: Compute Bézier‐Curve Insole Geometry (fallback if needed)
// ────────────────────────────────────────────────────────────
function computeInsoleGeometry(params: {
    width: number;
    length: number;
    thickness: number;
    realistic: boolean;
}): ExtrudeGeometry {
    const { width, length, thickness, realistic } = params;
    const halfWidth = width / 2;

    // 1. Define anchor points on X–Z plane for outline
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

    // 3. Extrude to uniform depth
    const extrudeSettings: ExtrudeGeometryOptions = {
        depth: thickness,
        bevelEnabled: false,
        steps: 1,
    };
    const geom = new ExtrudeGeometry(shape, extrudeSettings);

    if (realistic) {
        // 4. Modify top‐face vertices (y ≈ thickness) to add arch support, heel cup, toe taper
        const posAttr = geom.attributes.position as THREE.BufferAttribute;
        const vertexCount = posAttr.count;

        const heelThick = thickness * 0.8;
        const archThick = thickness * 1.0;
        const foreThick = thickness * 0.6;
        const toeThick = thickness * 0.2;
        const heelCupDepth = thickness * 0.10;

        for (let i = 0; i < vertexCount; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const z = posAttr.getZ(i);

            // Only sculpt the top face (y ≈ thickness)
            if (Math.abs(y - thickness) < 1e-5) {
                const t = THREE.MathUtils.clamp(z / length, 0, 1);
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

                // Heel cup if in heel region
                if (t < 0.15) {
                    const factor = 1 - Math.min(Math.abs(x) / halfWidth, 1);
                    targetY -= heelCupDepth * factor;
                }

                posAttr.setY(i, targetY);
            }
        }
        posAttr.needsUpdate = true;
        geom.computeVertexNormals();
    }

    return geom;
}

// ────────────────────────────────────────────────────────────
// React Component: InsoleMesh
//
// If using the imported GLTF, this component simply renders that mesh
// and applies transforms (scale/color). If not using GLTF, it falls back
// to rendering a procedurally generated Bézier‐extruded geometry.
// ────────────────────────────────────────────────────────────
interface InsoleMeshProps {
    width3D: number;
    length3D: number;
    thickness3D: number;
    colorHex: string;
    realistic: boolean;
    useImportedModel: boolean; // toggle between imported GLTF vs procedural
}

const InsoleMesh: React.FC<InsoleMeshProps> = ({
    width3D,
    length3D,
    thickness3D,
    colorHex,
    realistic,
    useImportedModel,
}) => {
    // 1. If useImportedModel = true, load GLTF. Else fallback to procedural.
    // We assume the file is at /models/insole.glb under public/.
    const gltf = useGLTF('/models/insole.glb') as any;
    // (Blender export should have a mesh named "Insole" or similar.)

    // 2. Memoize procedural geometry if useImportedModel is false
    const proceduralGeom = useMemo(() => {
        return computeInsoleGeometry({
            width: width3D,
            length: length3D,
            thickness: thickness3D,
            realistic,
        });
    }, [width3D, length3D, thickness3D, realistic]);

    // 3. Animate rotation for inspection
    useFrame((state, delta) => {
        state.scene.rotation.y += delta * 0.05;
    });

    if (useImportedModel && gltf?.scene) {
        // Assume the insole is the first child mesh of the gltf scene
        // You might need to drill down: gltf.nodes or gltf.scene.children[0]
        const insoleModel = gltf.scene.children[0] as THREE.Mesh;

        return (
            <primitive
                object={insoleModel}
                // Center pivot might not be at origin; adjust as needed
                scale={[width3D, length3D, thickness3D]}
                // In many Blender exports, the mesh is oriented differently.
                // You may need to rotate by -90° around X so it lies flat:
                rotation={[-Math.PI / 2, 0, 0]}
            >
                {/* Override material color if desired */}
                <meshStandardMaterial color={colorHex} />
            </primitive>
        );
    }

    // Otherwise, render the procedural mesh
    return (
        <mesh geometry={proceduralGeom}>
            <meshStandardMaterial color={colorHex} />
        </mesh>
    );
};

// ────────────────────────────────────────────────────────────
// Main Page: OrderPage
// ────────────────────────────────────────────────────────────
const OrderPage: React.FC = () => {
    // Form-state
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [shoeType, setShoeType] = useState<string>('');
    const [shoeSize, setShoeSize] = useState<string>('');

    // Recent Submissions
    const [recentSubmissions, setRecentSubmissions] = useState<OrderData[]>([]);

    // Orthotic options
    const [lengthVal, setLengthVal] = useState<number>(50);
    const [widthVal, setWidthVal] = useState<WidthOption>('Medium');
    const [thicknessVal, setThicknessVal] = useState<ThicknessOption>('Thin');
    const [colourVal, setColourVal] = useState<ColourOption>('Black');

    // Toggles
    const [realistic, setRealistic] = useState<boolean>(false);
    const [useImportedModel, setUseImportedModel] = useState<boolean>(true);

    // Handle form submission
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

    // Compute 3D parameters
    const computePreviewParams = () => {
        // Map WidthOption → scaleX
        let w3d = 1;
        if (widthVal === 'Narrow') w3d = 0.75;
        else if (widthVal === 'Wide') w3d = 1.25;

        // Map lengthVal (0–100) → scaleZ (1.0–2.5)
        const l3d = 1 + (lengthVal / 100) * 1.5;

        // Map thicknessVal → scaleY (0.2 vs 0.4)
        const t3d = thicknessVal === 'Thick' ? 0.4 : 0.2;

        // Map colourVal → hex
        let cHex = '#000000';
        if (colourVal === 'Grey') cHex = '#777777';
        else if (colourVal === 'Blue') cHex = '#1E90FF';
        else if (colourVal === 'Red') cHex = '#DC143C';

        return {
            dimensions: [w3d, t3d, l3d] as [number, number, number],
            color: cHex,
        };
    };

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

                {/* Toggle: Use Imported Model */}
                <div>
                    <label htmlFor="importedToggle">
                        <input
                            id="importedToggle"
                            type="checkbox"
                            checked={useImportedModel}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setUseImportedModel(e.target.checked)}
                        />{' '}
                        Use Imported Blender Model
                    </label>
                </div>

                {/* Submit Button */}
                <div className="FullSpan">
                    <button type="submit">Place My Order</button>
                </div>
            </form>

            {/* ──────────────────────────────────────────────────────────── */}
            {/*   Live 3D Insole Preview (Imported GLTF vs Procedural)     */}
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

                            {/* Render InsoleMesh, passing useImportedModel */}
                            <InsoleMesh
                                width3D={width3D}
                                length3D={length3D}
                                thickness3D={thickness3D}
                                colorHex={color}
                                realistic={realistic}
                                useImportedModel={useImportedModel}
                            />
                        </Canvas>
                    </div>
                </div>

                <div className="InsoleLabel" style={{ marginTop: '1em' }}>
                    Width: {widthVal}, Thickness: {thicknessVal}, Colour: {colourVal}, Length: {lengthVal}%
                    {realistic && ' (Realistic Mode On)'}
                    {useImportedModel ? ' (Using Imported Model)' : ' (Procedural Model)'}
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

// ────────────────────────────────────────────────────────────
// NOTE: Call useGLTF.preload('/models/insole.glb') at a higher level
// (e.g., in App.tsx) if you want to prefetch the glb. Example:
// import { useGLTF } from '@react-three/drei';
// useGLTF.preload('/models/insole.glb');
// ──────────────────────────────────────────────────────────── The model appears on this code on the web page 