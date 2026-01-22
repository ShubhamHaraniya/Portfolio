/**
 * Three.js 3D Scene
 * Creates an immersive particle field background with floating geometric shapes
 */

class ThreeScene {
    constructor() {
        this.canvas = document.getElementById('three-canvas');
        if (!this.canvas) return;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.geometries = [];
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        this.clock = new THREE.Clock();

        this.init();
        this.createParticles();
        this.createFloatingShapes();
        this.addEventListeners();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a0f, 1, 100);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.z = 30;

        // Renderer - optimized for performance
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1); // Use 1 for better performance
        this.renderer.setClearColor(0x0a0a0f, 1);
    }

    createParticles() {
        const particleCount = 400; // Reduced for performance
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color1 = new THREE.Color(0x6366f1); // Indigo
        const color2 = new THREE.Color(0x8b5cf6); // Purple
        const color3 = new THREE.Color(0xa855f7); // Light purple

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Spread particles in 3D space
            positions[i3] = (Math.random() - 0.5) * 100;
            positions[i3 + 1] = (Math.random() - 0.5) * 100;
            positions[i3 + 2] = (Math.random() - 0.5) * 100;

            // Randomize colors between accent colors
            const colorChoice = Math.random();
            let color;
            if (colorChoice < 0.33) {
                color = color1;
            } else if (colorChoice < 0.66) {
                color = color2;
            } else {
                color = color3;
            }

            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            // Random sizes
            sizes[i] = Math.random() * 2 + 0.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createFloatingShapes() {
        // Reduced shapes for better performance
        const shapes = [
            { geometry: new THREE.IcosahedronGeometry(2, 0), position: { x: -15, y: 8, z: -10 } },
            { geometry: new THREE.OctahedronGeometry(1.5, 0), position: { x: 18, y: -5, z: -15 } },
            { geometry: new THREE.TetrahedronGeometry(1.8, 0), position: { x: 12, y: 10, z: -12 } }
        ];

        const material = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            wireframe: true,
            transparent: true,
            opacity: 0.3
        });

        shapes.forEach((shape, index) => {
            const mesh = new THREE.Mesh(shape.geometry, material.clone());
            mesh.position.set(shape.position.x, shape.position.y, shape.position.z);
            mesh.userData = {
                originalPosition: { ...shape.position },
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.01,
                    y: (Math.random() - 0.5) * 0.01,
                    z: (Math.random() - 0.5) * 0.01
                },
                floatSpeed: 0.5 + Math.random() * 0.5,
                floatOffset: Math.random() * Math.PI * 2
            };
            this.geometries.push(mesh);
            this.scene.add(mesh);
        });
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const elapsedTime = this.clock.getElapsedTime();

        // Smooth mouse following
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

        // Rotate particles (removed expensive per-frame position updates)
        if (this.particles) {
            this.particles.rotation.y = elapsedTime * 0.03;
            this.particles.rotation.x = this.mouse.y * 0.05;
        }

        // Animate floating shapes
        this.geometries.forEach((mesh) => {
            const { rotationSpeed, floatSpeed, floatOffset, originalPosition } = mesh.userData;

            // Rotation
            mesh.rotation.x += rotationSpeed.x;
            mesh.rotation.y += rotationSpeed.y;
            mesh.rotation.z += rotationSpeed.z;

            // Floating motion
            mesh.position.y = originalPosition.y + Math.sin(elapsedTime * floatSpeed + floatOffset) * 2;
            mesh.position.x = originalPosition.x + Math.cos(elapsedTime * floatSpeed * 0.5 + floatOffset) * 1;

            // React to mouse
            mesh.position.x += this.mouse.x * 2;
            mesh.position.y += this.mouse.y * 2;
        });

        // Subtle camera movement based on mouse
        this.camera.position.x += (this.mouse.x * 2 - this.camera.position.x) * 0.02;
        this.camera.position.y += (this.mouse.y * 2 - this.camera.position.y) * 0.02;
        this.camera.lookAt(this.scene.position);

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize Three.js scene when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if Three.js is loaded
    if (typeof THREE !== 'undefined') {
        window.threeScene = new ThreeScene();
    } else {
        console.warn('Three.js not loaded, skipping 3D background');
    }
});
