// src/pages/OrderPage.tsx

import React, {
    useState,
    useEffect,
    ChangeEvent,
    FormEvent,
} from 'react';
import { Canvas, extend } from '@react-three/fiber';
import {
    Mesh,
    BoxGeometry,
    CylinderGeometry,
    MeshStandardMaterial,
    AmbientLight,
    DirectionalLight,
} from 'three';
import { OrbitControls } from '@react-three/drei';

// ────────────────────────────────────────────────────────────
// Register Three.js primitives so that JSX <mesh />, <boxGeometry />,
// <cylinderGeometry />, <meshStandardMaterial />, <ambientLight />,
// and <directionalLight /> work inside R3F.
// ────────────────────────────────────────────────────────────
extend({
    Mesh,
    BoxGeometry,
    CylinderGeometry,
    MeshStandardMaterial,
    AmbientLight,
    DirectionalLight,
});

/**
 * Our front‐end “shape” for an order.
 * We’ve included all fields the backend expects.
 */
interface OrderData {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    shoeType: string;
    shoeSize: string;
    lengthVal: number;
    widthVal: WidthOption;
    thicknessVal: ThicknessOption;
    colourVal: ColourOption;
}

type WidthOption = 'Narrow' | 'Medium' | 'Wide';
type ThicknessOption = 'Thin' | 'Thick';
type ColourOption = 'Black' | 'Grey' | 'Blue' | 'Red';

// The base URL for our API must be provided via environment variable.
const API_BASE = 'https://3d-ordering-platform-backend.vercel.app';
if (!API_BASE) {
    throw new Error('REACT_APP_API_URL is not defined in .env');
}

const OrderPage: React.FC = () => {
    // ──────────────────────────────────────────────────────────
    // 1. Form‐state
    // ──────────────────────────────────────────────────────────
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [address, setAddress] = useState<string>(''); // required by backend
    const [shoeType, setShoeType] = useState<string>('');
    const [shoeSize, setShoeSize] = useState<string>('');

    // ──────────────────────────────────────────────────────────
    // 2. Orders fetched from backend
    // ──────────────────────────────────────────────────────────
    const [orders, setOrders] = useState<OrderData[]>([]);

    // ──────────────────────────────────────────────────────────
    // 3. Orthotic options
    // ──────────────────────────────────────────────────────────
    const [lengthVal, setLengthVal] = useState<number>(50);
    const [widthVal, setWidthVal] = useState<WidthOption>('Medium');
    const [thicknessVal, setThicknessVal] = useState<ThicknessOption>('Thin');
    const [colourVal, setColourVal] = useState<ColourOption>('Black');

    // ──────────────────────────────────────────────────────────
    // 4. Function to fetch all orders from the server
    // ──────────────────────────────────────────────────────────
    const getAllOrders = async () => {
        try {
            const res = await fetch(`${API_BASE}/orders`);
            if (!res.ok) {
                console.error('Failed to fetch orders:', res.statusText);
                return;
            }
            const serverData: any[] = await res.json();
            // Map each server‐side (snake_case) into our OrderData shape:
            const mapped: OrderData[] = serverData.map((o) => ({
                firstName: o.first_name,
                lastName: o.last_name,
                email: o.email,
                address: o.address,
                shoeType: o.shoe_type,
                shoeSize: o.shoe_size,
                lengthVal: o.shoe_length,
                widthVal: o.shoe_width as WidthOption,
                thicknessVal: o.shoe_thickness as ThicknessOption,
                colourVal: o.shoe_colour as ColourOption,
            }));
            setOrders(mapped);
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    // ──────────────────────────────────────────────────────────
    // 5. On mount, load all orders
    // ──────────────────────────────────────────────────────────
    useEffect(() => {
        getAllOrders();
    }, []);

    // ──────────────────────────────────────────────────────────
    // 6. Handle form submission → POST to backend, then refresh
    // ──────────────────────────────────────────────────────────
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const payload = {
            // backend expects snake_case keys:
            email: email,
            first_name: firstName,
            last_name: lastName,
            address: address,
            shoe_type: shoeType,
            shoe_size: shoeSize,
            shoe_length: lengthVal,
            shoe_width: widthVal,
            shoe_thickness: thicknessVal,
            shoe_colour: colourVal,
        };

        try {
            const res = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                console.error('Failed to create order:', res.status, errJson);
                alert(
                    `Error: ${errJson?.error || res.statusText || 'Unable to create order'
                    }`
                );
                return;
            }

            // We don’t need to manually prepend. Instead, just re-fetch all orders:
            await getAllOrders();

            // Clear the form
            setFirstName('');
            setLastName('');
            setEmail('');
            setAddress('');
            setShoeType('');
            setShoeSize('');
            setLengthVal(50);
            setWidthVal('Medium');
            setThicknessVal('Thin');
            setColourVal('Black');

            alert('Thank you, your order has been recorded!');
        } catch (err) {
            console.error('Error during POST /orders:', err);
            alert('An unexpected error occurred. Please try again.');
        }
    };

    // ──────────────────────────────────────────────────────────
    // 7. Compute preview color (for 3D)
    // ──────────────────────────────────────────────────────────
    const computePreviewParams = () => {
        let colorHex = '#000000';
        if (colourVal === 'Grey') colorHex = '#777777';
        else if (colourVal === 'Blue') colorHex = '#1E90FF';
        else if (colourVal === 'Red') colorHex = '#DC143C';
        return { color: colorHex };
    };

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
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setFirstName(e.target.value)
                        }
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setLastName(e.target.value)
                        }
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setEmail(e.target.value)
                        }
                        required
                    />
                </div>

                {/* Address */}
                <div>
                    <label htmlFor="address">Address *</label>
                    <input
                        id="address"
                        type="text"
                        placeholder="Street, City, State"
                        value={address}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setAddress(e.target.value)
                        }
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setShoeType(e.target.value)
                        }
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
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setShoeSize(e.target.value)
                        }
                    />
                </div>

                {/* Length slider */}
                <div className="FullSpan">
                    <label htmlFor="lengthVal">
                        Length:{' '}
                        {lengthVal < 25
                            ? 'Short'
                            : lengthVal > 75
                                ? 'Long'
                                : 'Medium'}{' '}
                        ({lengthVal})
                    </label>
                    <input
                        id="lengthVal"
                        type="range"
                        min="0"
                        max="100"
                        value={lengthVal}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setLengthVal(Number(e.target.value))
                        }
                    />
                </div>

                {/* Width select */}
                <div>
                    <label htmlFor="widthVal">Width *</label>
                    <select
                        id="widthVal"
                        value={widthVal}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                            setWidthVal(e.target.value as WidthOption)
                        }
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
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                            setThicknessVal(e.target.value as ThicknessOption)
                        }
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
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                            setColourVal(e.target.value as ColourOption)
                        }
                        required
                    >
                        <option value="Black">Black</option>
                        <option value="Grey">Grey</option>
                        <option value="Blue">Blue</option>
                        <option value="Red">Red</option>
                    </select>
                </div>

                {/* Submit Button */}
                <div className="FullSpan">
                    <button type="submit">Place My Order</button>
                </div>
            </form>

            {/* ──────────────────────────────────────────────────────────── */}
            {/*   Live 3D Insole Preview (Canvas)   */}
            {/* ──────────────────────────────────────────────────────────── */}
            <div className="Visualization">
                <h3>Live 3D Insole Preview</h3>
                <div className="InsoleCanvasContainer debug-visible">
                    <div className="canvas-container">
                        <Canvas camera={{ position: [0, 0, 5] }}>
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[2, 2, 5]} intensity={1} />
                            <OrbitControls enableZoom={true} />

                            {(() => {
                                const { color } = computePreviewParams();
                                const t = lengthVal / 100;
                                const widthFactor = widthVal === 'Narrow' ? 0.7 : widthVal === 'Medium' ? 0.85 : 1.0;
                                const thicknessFactor = thicknessVal === 'Thin' ? 0.5 : 1.0;

                                // Cylinder 1 transforms
                                const cyl1PosX = -1.1 + t * (-1.54 + 1.1);
                                const cyl1ScaleX = 0.691 + t * (1.0 - 0.691);
                                const cyl1ScaleY = -0.13 * thicknessFactor;
                                const cyl1ScaleZ = 0.715 * widthFactor;

                                // Box 1 transforms
                                const box1PosX = -0.54;
                                const box1PosZ = 0.04 + t * (0 - 0.04);
                                const box1ScaleX = 1.245 + t * (2.166 - 1.245);
                                const box1ScaleY = 0.09 * thicknessFactor;
                                const box1ScaleZ = 1.142 * widthFactor;
                                const box1RotZ = 25;

                                // Box 2 transforms
                                const box2PosX = 0.52;
                                const box2PosZ = 0.04;
                                const box2ScaleX = 1.241 + t * (2.166 - 1.241);
                                const box2ScaleY = 0.09 * thicknessFactor;
                                const box2ScaleZ = 1.142 * widthFactor;
                                const box2RotZ = -25;

                                // Cylinder 2 transforms
                                const cyl2PosX = 1.28 + t * (1.36 - 1.28);
                                const cyl2ScaleX = 0.943 + t * (1.566 - 0.943);
                                const cyl2ScaleY = -0.13 * thicknessFactor;
                                const cyl2ScaleZ = 0.935 * widthFactor;

                                return (
                                    <group
                                        /* Rotate by 45° then shift X to approximately center */
                                        rotation={[Math.PI / 4, 0, 0]}
                                        position={[0, 2, 0]}
                                    >
                                        {/* Cylinder 1 */}
                                        <mesh
                                            position={[cyl1PosX, 0, 0]}
                                            rotation={[0, 0, 0]}
                                            scale={[cyl1ScaleX, cyl1ScaleY, cyl1ScaleZ]}
                                        >
                                            <cylinderGeometry args={[1, 1, 1, 32]} />
                                            <meshStandardMaterial color={color} />
                                        </mesh>

                                        {/* Box 1 */}
                                        <mesh
                                            position={[box1PosX, 0, box1PosZ]}
                                            rotation={[0, 0, box1RotZ]}
                                            scale={[box1ScaleX, box1ScaleY, box1ScaleZ]}
                                        >
                                            <boxGeometry args={[1, 1, 1]} />
                                            <meshStandardMaterial color={color} />
                                        </mesh>

                                        {/* Box 2 */}
                                        <mesh
                                            position={[box2PosX, 0, box2PosZ]}
                                            rotation={[0, 0, box2RotZ]}
                                            scale={[box2ScaleX, box2ScaleY, box2ScaleZ]}
                                        >
                                            <boxGeometry args={[1, 1, 1]} />
                                            <meshStandardMaterial color={color} />
                                        </mesh>

                                        {/* Cylinder 2 */}
                                        <mesh
                                            position={[cyl2PosX, 0, 0]}
                                            rotation={[0, 0, 0]}
                                            scale={[cyl2ScaleX, cyl2ScaleY, cyl2ScaleZ]}
                                        >
                                            <cylinderGeometry args={[1, 1, 1, 32]} />
                                            <meshStandardMaterial color={color} />
                                        </mesh>
                                    </group>
                                );
                            })()}
                        </Canvas>

                    </div>
                </div>

                <div className="InsoleLabel">
                    {widthVal}, {thicknessVal}, {colourVal}, Length: {lengthVal}%
                </div>
            </div>

            {/* ──────────────────────────────────────────────────────────── */}
            {/*    Recent Submissions (from server via getAllOrders)       */}
            {/* ──────────────────────────────────────────────────────────── */}
            {orders.length > 0 && (
                <div className="RecentSubmissions">
                    <h3>Recent Submissions</h3>
                    <ul>
                        {orders.map((sub, idx) => (
                            <li key={idx}>
                                <strong>
                                    {sub.firstName} {sub.lastName}
                                </strong>{' '}
                                ({sub.email}) — {sub.widthVal} / {sub.thicknessVal} /{' '}
                                {sub.colourVal}, Length: {sub.lengthVal}%
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
};

export default OrderPage;
