import React from 'react';
import { Canvas, extend } from '@react-three/fiber';
// Import Three.js classes to register as JSX elements
import { Mesh, BoxGeometry, MeshStandardMaterial, AmbientLight, DirectionalLight } from 'three';

// Register Three.js classes so they can be used as JSX tags in the Canvas
extend({ Mesh, BoxGeometry, MeshStandardMaterial, AmbientLight, DirectionalLight });

const BoxScene: React.FC = () => {
    return (
        <div className="canvas-container">
            <Canvas
                camera={{ position: [0, 0, 5] }}
            >
                {/* Lights to illuminate the MeshStandardMaterial (ambient + directional) */}
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 2, 5]} intensity={1} />

                {/* A simple green cube mesh at the origin */}
                <mesh /* default position [0,0,0] */>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="green" />
                </mesh>

                {/* Optional: Axes helper for debugging orientation (red X, green Y, blue Z) */}
                {/* <axesHelper args={[5]} /> */}
            </Canvas>
        </div>
    );
};

export default BoxScene;
