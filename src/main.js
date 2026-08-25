import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =====================================================
// SCÈNE
// =====================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0xcfc4b2);

// =====================================================
// CONTENEUR DU PORTFOLIO
// =====================================================

const portfolio = document.getElementById('portfolio');

if (!portfolio) {
    console.error('Erreur : #portfolio introuvable dans index.html');
}

// =====================================================
// RENDERER
// =====================================================

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.toneMapping = THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.0;

// =====================================================
// OMBRES
// =====================================================

renderer.shadowMap.enabled = true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

// =====================================================
// CANVAS
// =====================================================

if (portfolio) {

    portfolio.appendChild(
        renderer.domElement
    );

}

// =====================================================
// LUMIÈRE AMBIANTE
// =====================================================

const hemisphereLight =
    new THREE.HemisphereLight(
        0xfff8e8,
        0x665f55,
        1.5
    );

scene.add(
    hemisphereLight
);

// =====================================================
// LUMIÈRE PRINCIPALE
// =====================================================

const mainLight =
    new THREE.DirectionalLight(
        0xfff4df,
        3
    );

mainLight.position.set(
    5,
    10,
    5
);

mainLight.castShadow = true;

mainLight.shadow.mapSize.width =
    2048;

mainLight.shadow.mapSize.height =
    2048;

mainLight.shadow.camera.near =
    0.1;

mainLight.shadow.camera.far =
    100;

mainLight.shadow.camera.left =
    -20;

mainLight.shadow.camera.right =
    20;

mainLight.shadow.camera.top =
    20;

mainLight.shadow.camera.bottom =
    -20;

mainLight.shadow.bias =
    -0.0001;

scene.add(
    mainLight
);

// =====================================================
// LUMIÈRE DE REMPLISSAGE
// =====================================================

const fillLight =
    new THREE.DirectionalLight(
        0xe8e0d2,
        1
    );

fillLight.position.set(
    -5,
    5,
    -5
);

scene.add(
    fillLight
);

// =====================================================
// VARIABLES
// =====================================================

let camera = null;
let controls = null;
let room = null;

// =====================================================
// NAVIGATION LIBRE — CLAVIER, SOURIS ET TACTILE
// =====================================================

const activeMoves = new Set();

const navigationSpeed = 3.5;

const navigationTimer = new THREE.Timer();

function moveVisitor(direction, distance) {

    if (!camera || !controls) {

        return;

    }

    const forward =
        new THREE.Vector3();

    camera.getWorldDirection(forward);

    forward.y = 0;

    forward.normalize();

    const right =
        new THREE.Vector3(
            forward.z,
            0,
            -forward.x
        );

    const offset =
        new THREE.Vector3();

    if (direction === 'forward') {

        offset.copy(forward);

    }

    if (direction === 'backward') {

        offset.copy(forward).negate();

    }

    if (direction === 'left') {

        offset.copy(right).negate();

    }

    if (direction === 'right') {

        offset.copy(right);

    }

    offset.multiplyScalar(distance);

    camera.position.add(offset);

    controls.target.add(offset);

}

function createNavigationUI() {

    if (document.getElementById('navigation-ui')) {

        return;

    }

    const ui = document.createElement('aside');

    ui.id = 'navigation-ui';

    ui.setAttribute(
        'aria-label',
        'Commandes de navigation'
    );

    ui.innerHTML = `
        <p class="navigation-hint">
            <span class="desktop-hint">ZQSD / WASD ou flèches pour avancer</span>
            <span class="touch-hint">Glissez pour regarder · utilisez le pad pour avancer</span>
        </p>
        <div class="navigation-pad" aria-label="Se déplacer">
            <button data-move="forward" aria-label="Avancer">↑</button>
            <button data-move="left" aria-label="Aller à gauche">←</button>
            <button data-move="backward" aria-label="Reculer">↓</button>
            <button data-move="right" aria-label="Aller à droite">→</button>
        </div>
    `;

    document.body.appendChild(ui);

    const style = document.createElement('style');

    style.id = 'navigation-style';

    style.textContent = `
        #navigation-ui { position: fixed; right: 22px; bottom: 20px; z-index: 100; color: #f7f0e5; font: 11px Arial, sans-serif; letter-spacing: 1px; text-align: right; pointer-events: none; text-shadow: 0 1px 8px rgba(0,0,0,.65); }
        .navigation-hint { margin: 0 0 10px; opacity: .9; }
        .touch-hint { display: none; }
        .navigation-pad { display: grid; grid-template-columns: repeat(3, 38px); gap: 5px; justify-content: end; pointer-events: auto; }
        .navigation-pad button { width: 38px; height: 38px; border: 1px solid rgba(255,255,255,.38); background: rgba(27,23,18,.34); color: #fff; font-size: 19px; cursor: pointer; backdrop-filter: blur(7px); touch-action: none; }
        .navigation-pad button:hover, .navigation-pad button:active { background: rgba(233,226,213,.42); }
        .navigation-pad button[data-move="forward"] { grid-column: 2; }
        .navigation-pad button[data-move="left"] { grid-column: 1; grid-row: 2; }
        .navigation-pad button[data-move="backward"] { grid-column: 2; grid-row: 2; }
        .navigation-pad button[data-move="right"] { grid-column: 3; grid-row: 2; }
        @media (max-width: 900px) { #navigation-ui { right: 16px; bottom: 16px; } .desktop-hint { display: none; } .touch-hint { display: inline; } .navigation-pad { grid-template-columns: repeat(3, 46px); } .navigation-pad button { width: 46px; height: 46px; } }
    `;

    document.head.appendChild(style);

    ui.querySelectorAll('[data-move]').forEach(
        (button) => {

            const direction =
                button.dataset.move;

            button.addEventListener(
                'pointerdown',
                (event) => {

                    event.preventDefault();

                    activeMoves.add(direction);

                    button.setPointerCapture(
                        event.pointerId
                    );

                }
            );

            const stop = () => {
                activeMoves.delete(direction);
            };

            button.addEventListener('pointerup', stop);
            button.addEventListener('pointercancel', stop);
            button.addEventListener('pointerleave', stop);

        }
    );

}

window.addEventListener(
    'keydown',
    (event) => {

        const directionByKey = {
            KeyW: 'forward',
            KeyZ: 'forward',
            ArrowUp: 'forward',
            KeyS: 'backward',
            ArrowDown: 'backward',
            KeyA: 'left',
            KeyQ: 'left',
            ArrowLeft: 'left',
            KeyD: 'right',
            ArrowRight: 'right'
        };

        const direction = directionByKey[event.code];

        if (direction) {

            event.preventDefault();

            activeMoves.add(direction);

        }

    }
);

window.addEventListener(
    'keyup',
    (event) => {

        const directionByKey = {
            KeyW: 'forward', KeyZ: 'forward', ArrowUp: 'forward',
            KeyS: 'backward', ArrowDown: 'backward',
            KeyA: 'left', KeyQ: 'left', ArrowLeft: 'left',
            KeyD: 'right', ArrowRight: 'right'
        };

        const direction = directionByKey[event.code];

        if (direction) {

            activeMoves.delete(direction);

        }

    }
);

// =====================================================
// ABOUT ME
// =====================================================

function createAboutMePanel() {

    if (
        document.getElementById(
            'about-me-panel'
        )
    ) {
        return;
    }

    const panel =
        document.createElement('div');

    panel.id =
        'about-me-panel';

    panel.innerHTML = `

        <div class="about-overlay"></div>

        <div class="about-window">

            <button
                class="about-close"
                id="about-close"
                aria-label="Fermer"
            >
                ×
            </button>

            <div class="about-small-title">
                ABOUT ME
            </div>

            <h1>
                Kiasi Salumu Dolivin
            </h1>

            <p class="about-intro">
                Étudiant en ingénierie électromécanique,
                avec un fort intérêt pour la robotique,
                l'informatique et les technologies créatives.
            </p>

            <!-- =========================================
                 DOMAINES D'INTÉRÊT
            ========================================== -->

            <div class="about-section">

                <h2>
                    DOMAINES D'INTÉRÊT
                </h2>

                <div class="about-list">

                    <span>
                        Robotique
                    </span>

                    <span>
                        Informatique & développement logiciel
                    </span>

                    <span>
                        Intelligence artificielle
                    </span>

                    <span>
                        Animation 2D & 3D
                    </span>

                    <span>
                        Dessin réaliste
                    </span>

                    <span>
                        Guitare
                    </span>

                    <span>
                        Cinéma
                    </span>

                    <span>
                        Sports de combat
                    </span>

                </div>

            </div>

            <!-- =========================================
                 COMPÉTENCES
            ========================================== -->

            <div class="about-section">

                <h2>
                    COMPÉTENCES
                </h2>

                <div class="about-list">

                    <span>
                        Python — Intermédiaire
                    </span>

                    <span>
                        Git & GitHub — En pratique
                    </span>

                    <span>
                        Pygame — En pratique
                    </span>

                    <span>
                        Dessin réaliste — Pratique
                    </span>

                    <span>
                        Guitare — Pratique
                    </span>

                </div>

            </div>

            <!-- =========================================
                 EN APPRENTISSAGE
            ========================================== -->

            <div class="about-section">

                <h2>
                    EN APPRENTISSAGE
                </h2>

                <div class="about-list">

                    <span>
                        SQL
                    </span>

                    <span>
                        Power BI
                    </span>

                    <span>
                        Three.js
                    </span>

                    <span>
                        Robotique
                    </span>

                    <span>
                        Intelligence artificielle
                    </span>

                </div>

            </div>

            <!-- =========================================
                 LANGUES
            ========================================== -->

            <div class="about-section">

                <h2>
                    LANGUES
                </h2>

                <div class="languages">

                    <div>

                        <strong>
                            Français
                        </strong>

                        <span>
                            C1
                        </span>

                    </div>

                    <div>

                        <strong>
                            Lingala
                        </strong>

                        <span>
                            C1
                        </span>

                    </div>

                    <div>

                        <strong>
                            Portugais
                        </strong>

                        <span>
                            B1
                        </span>

                    </div>

                    <div>

                        <strong>
                            Anglais
                        </strong>

                        <span>
                            A2
                        </span>

                    </div>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(
        panel
    );

    // =================================================
    // STYLE ABOUT ME
    // =================================================

    const style =
        document.createElement('style');

    style.id =
        'about-me-style';

    style.textContent = `

        #about-me-panel {

            position: fixed;

            inset: 0;

            z-index: 5000;

            display: flex;

            align-items: center;

            justify-content: center;

            opacity: 0;

            visibility: hidden;

            transition:
                opacity 0.35s ease,
                visibility 0.35s ease;

            pointer-events: none;

        }

        #about-me-panel.active {

            opacity: 1;

            visibility: visible;

            pointer-events: auto;

        }

        .about-overlay {

            position: absolute;

            inset: 0;

            background:
                rgba(20, 18, 15, 0.42);

            backdrop-filter:
                blur(5px);

        }

        .about-window {

            position: relative;

            width: min(
                760px,
                88vw
            );

            max-height: 86vh;

            overflow-y: auto;

            padding: 42px 48px;

            background: #e9e2d5;

            color: #292722;

            box-shadow:
                0 25px 70px
                rgba(0, 0, 0, 0.25);

            border:
                1px solid
                rgba(41, 39, 34, 0.15);

            transform:
                translateY(20px);

            transition:
                transform 0.4s ease;

        }

        #about-me-panel.active
        .about-window {

            transform:
                translateY(0);

        }

        .about-close {

            position: absolute;

            top: 18px;

            right: 22px;

            width: 35px;

            height: 35px;

            border: none;

            background: transparent;

            font-size: 28px;

            font-weight: 300;

            color: #292722;

            cursor: pointer;

            z-index: 2;

        }

        .about-close:hover {

            opacity: 0.55;

        }

        .about-small-title {

            margin-bottom: 14px;

            font-size: 10px;

            letter-spacing: 4px;

            opacity: 0.5;

        }

        .about-window h1 {

            margin: 0;

            font-family:
                Georgia,
                "Times New Roman",
                serif;

            font-size:
                clamp(
                    32px,
                    5vw,
                    52px
                );

            font-weight: 400;

            letter-spacing: -1px;

        }

        .about-intro {

            max-width: 620px;

            margin-top: 22px;

            font-size: 14px;

            line-height: 1.8;

            color:
                rgba(
                    41,
                    39,
                    34,
                    0.68
                );

        }

        .about-section {

            margin-top: 32px;

            padding-top: 22px;

            border-top:
                1px solid
                rgba(
                    41,
                    39,
                    34,
                    0.13
                );

        }

        .about-section h2 {

            margin:
                0 0 15px;

            font-size: 10px;

            letter-spacing: 3px;

            font-weight: 600;

            opacity: 0.55;

        }

        .about-list {

            display: flex;

            flex-wrap: wrap;

            gap: 8px;

        }

        .about-list span {

            padding:
                8px 11px;

            border:
                1px solid
                rgba(
                    41,
                    39,
                    34,
                    0.15
                );

            font-size: 12px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    0.18
                );

        }

        .languages {

            display: grid;

            grid-template-columns:
                repeat(
                    4,
                    1fr
                );

            gap: 12px;

        }

        .languages div {

            display: flex;

            flex-direction: column;

            gap: 5px;

            padding: 12px;

            border-left:
                1px solid
                rgba(
                    41,
                    39,
                    34,
                    0.2
                );

        }

        .languages strong {

            font-size: 13px;

            font-weight: 500;

        }

        .languages span {

            font-size: 11px;

            opacity: 0.5;

        }

        @media (max-width: 600px) {

            .about-window {

                width: 90vw;

                max-height: 88vh;

                padding:
                    30px 24px;

            }

            .about-window h1 {

                font-size: 32px;

            }

            .about-intro {

                font-size: 12px;

            }

            .languages {

                grid-template-columns:
                    repeat(
                        2,
                        1fr
                    );

            }

            .about-list span {

                font-size: 11px;

            }

        }

    `;

    document.head.appendChild(
        style
    );

    // =================================================
    // BOUTON FERMER
    // =================================================

    const closeButton =
        document.getElementById(
            'about-close'
        );

    if (closeButton) {

        closeButton.addEventListener(
            'click',
            closeAboutMe
        );

    }

    // =================================================
    // CLIC SUR L'ARRIÈRE-PLAN
    // =================================================

    const overlay =
        panel.querySelector(
            '.about-overlay'
        );

    if (overlay) {

        overlay.addEventListener(
            'click',
            closeAboutMe
        );

    }

}

// =====================================================
// OUVRIR ABOUT ME
// =====================================================

function openAboutMe() {

    let panel =
        document.getElementById(
            'about-me-panel'
        );

    if (!panel) {

        createAboutMePanel();

        panel =
            document.getElementById(
                'about-me-panel'
            );

    }

    if (panel) {

        requestAnimationFrame(() => {

            panel.classList.add(
                'active'
            );

        });

    }

}

// =====================================================
// FERMER ABOUT ME
// =====================================================

function closeAboutMe() {

    const panel =
        document.getElementById(
            'about-me-panel'
        );

    if (panel) {

        panel.classList.remove(
            'active'
        );

    }

}

// =====================================================
// PANNEAUX PROJECTS / CONTACT
// =====================================================

function openInfoPanel(title, content) {

    let panel =
        document.getElementById(
            'info-panel'
        );

    if (!panel) {

        panel = document.createElement('div');

        panel.id = 'info-panel';

        panel.innerHTML = `
            <div class="info-overlay"></div>
            <section class="info-window" role="dialog" aria-modal="true">
                <button class="info-close" aria-label="Fermer">×</button>
                <div class="info-small-title"></div>
                <div class="info-content"></div>
            </section>
        `;

        document.body.appendChild(panel);

        const style = document.createElement('style');

        style.textContent = `
            #info-panel { position: fixed; inset: 0; z-index: 5000; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .35s ease, visibility .35s ease; }
            #info-panel.active { opacity: 1; visibility: visible; pointer-events: auto; }
            .info-overlay { position: absolute; inset: 0; background: rgba(20,18,15,.42); backdrop-filter: blur(5px); }
            .info-window { position: relative; width: min(680px, 88vw); max-height: 80vh; overflow-y: auto; padding: 42px 48px; background: #e9e2d5; color: #292722; box-shadow: 0 25px 70px rgba(0,0,0,.25); transform: translateY(20px); transition: transform .4s ease; }
            #info-panel.active .info-window { transform: translateY(0); }
            .info-close { position: absolute; top: 16px; right: 22px; border: 0; background: transparent; color: #292722; font-size: 28px; cursor: pointer; }
            .info-small-title { margin-bottom: 18px; font-size: 10px; letter-spacing: 4px; opacity: .55; }
            .info-content h1 { margin: 0 0 20px; font-family: Georgia, "Times New Roman", serif; font-size: clamp(32px,5vw,50px); font-weight: 400; }
            .info-content p { font-size: 14px; line-height: 1.8; color: rgba(41,39,34,.68); }
            .info-content ul { margin: 24px 0 0; padding: 0; list-style: none; }
            .info-content li { padding: 13px 0; border-top: 1px solid rgba(41,39,34,.13); font-size: 14px; }
        `;

        document.head.appendChild(style);

        panel.querySelector('.info-close')
            .addEventListener('click', closeInfoPanel);

        panel.querySelector('.info-overlay')
            .addEventListener('click', closeInfoPanel);

    }

    panel.querySelector('.info-small-title').textContent = title;
    panel.querySelector('.info-content').innerHTML = content;

    requestAnimationFrame(() => {
        panel.classList.add('active');
    });

}

function closeInfoPanel() {

    document.getElementById('info-panel')
        ?.classList.remove('active');

}

function openProjects() {

    openInfoPanel(
        'PROJECTS',
        `<h1>Projects</h1><p>Une sélection de projets sera présentée ici.</p><ul><li>Portfolio 3D — Three.js & Blender</li><li>Robotique et électromécanique</li><li>Développement logiciel</li></ul>`
    );

}

function openContact() {

    openInfoPanel(
        'CONTACT',
        `<h1>Contact</h1><p>Les coordonnées et liens professionnels seront ajoutés ici. En attendant, les icônes sociales du décor restent la base prévue pour cette section.</p>`
    );

}

// =====================================================
// TOUCHE ESCAPE
// =====================================================

window.addEventListener(
    'keydown',
    (event) => {

        if (
            event.key === 'Escape'
        ) {

            closeAboutMe();

            closeInfoPanel();

        }

    }
);

// =====================================================
// CHARGEMENT DU MODÈLE BLENDER
// =====================================================

const loader =
new GLTFLoader();

loader.load(
    `${import.meta.env.BASE_URL}models/portfolio_room.glb`,
    (gltf) => {

        console.log(
            'Portfolio 3D chargé !'
        );

        // =================================================
        // MODÈLE
        // =================================================

        room =
            gltf.scene;

        scene.add(
            room
        );

        room.updateMatrixWorld(
            true
        );

        // =================================================
        // CONFIGURATION DES OBJETS
        // =================================================

        room.traverse(
            (object) => {

                if (
                    object.isMesh
                ) {

                    object.castShadow =
                        true;

                    object.receiveShadow =
                        true;

                    if (
                        object.material
                    ) {

                        object.material.needsUpdate =
                            true;

                    }

                }

            }
        );

        // =================================================
        // AFFICHER LES OBJETS INTERACTIFS
        // =================================================

        console.log(
            'Objets interactifs :'
        );

        room.traverse(
            (object) => {

                if (
                    object.name
                ) {

                    const name =
                        object.name.toUpperCase();

                    if (
                        name.includes(
                            'ABOUT'
                        ) ||
                        name.includes(
                            'CONTACT'
                        ) ||
                        name.includes(
                            'PROJECT'
                        )
                    ) {

                        console.log(
                            '→',
                            object.name
                        );

                    }

                }

            }
        );

        // =================================================
        // CAMERA BLENDER
        // =================================================

        let blenderCamera =
            room.getObjectByName(
                'CAMERA_MAIN'
            );

        if (
            !blenderCamera &&
            gltf.cameras.length > 0
        ) {

            blenderCamera =
                gltf.cameras[0];

            console.warn(
                'CAMERA_MAIN non trouvée.'
            );

            console.warn(
                'Première caméra utilisée :',
                blenderCamera.name
            );

        }

        // =================================================
        // UTILISER CAMERA BLENDER
        // =================================================

        if (
            blenderCamera
        ) {

            const worldPosition =
                new THREE.Vector3();

            const worldQuaternion =
                new THREE.Quaternion();

            blenderCamera.getWorldPosition(
                worldPosition
            );

            blenderCamera.getWorldQuaternion(
                worldQuaternion
            );

            camera =
                new THREE.PerspectiveCamera(
                    blenderCamera.fov || 45,

                    window.innerWidth /
                    window.innerHeight,

                    0.1,

                    5000
                );

            camera.position.copy(
                worldPosition
            );

            camera.quaternion.copy(
                worldQuaternion
            );

            scene.add(
                camera
            );

            console.log(
                'Caméra Blender utilisée :',
                blenderCamera.name
            );

        }

        // =================================================
        // CAMERA DE SECOURS
        // =================================================

        else {

            console.warn(
                'Aucune caméra Blender trouvée.'
            );

            // Les zones HIT_* sont volontairement grandes et placées
            // devant les libellés. Elles ne doivent pas influencer le
            // cadrage de secours lorsque la caméra Blender est absente.
            const box =
                new THREE.Box3();

            room.traverse(
                (object) => {

                    const name =
                        object.name
                            ? object.name.toUpperCase()
                            : '';

                    if (
                        object.isMesh &&
                        !name.startsWith('HIT_') &&
                        !name.startsWith('INTERACTIVE_')
                    ) {

                        box.expandByObject(
                            object
                        );

                    }

                }
            );

            const center =
                new THREE.Vector3();

            const size =
                new THREE.Vector3();

            box.getCenter(
                center
            );

            box.getSize(
                size
            );

            const maxSize =
                Math.max(
                    size.x,
                    size.y,
                    size.z
                );

            camera =
                new THREE.PerspectiveCamera(
                    45,

                    window.innerWidth /
                    window.innerHeight,

                    0.1,

                    maxSize * 20
                );

            camera.position.set(

                center.x +
                maxSize * 0.85,

                center.y +
                maxSize * 0.55,

                center.z +
                maxSize * 1.15

            );

            camera.lookAt(
                center
            );

            scene.add(
                camera
            );

        }

        // =================================================
        // ORBIT CONTROLS
        // =================================================

        controls =
            new OrbitControls(
                camera,
                renderer.domElement
            );

        controls.enableDamping =
            true;

        controls.dampingFactor =
            0.05;

        controls.enableRotate =
            true;

        controls.enableZoom =
            true;

        controls.enablePan =
            true;

        controls.rotateSpeed =
            0.5;

        controls.zoomSpeed =
            0.8;

        controls.panSpeed =
            0.8;

        // =================================================
        // LIMITES
        // =================================================

        controls.minDistance =
            1;

        controls.maxDistance =
            100;

        controls.minPolarAngle =
            0.25;

        controls.maxPolarAngle =
            Math.PI - 0.25;

        // =================================================
        // CENTRE DE ROTATION
        // =================================================

        const target =
            new THREE.Vector3();

        const box =
            new THREE.Box3()
                .setFromObject(
                    room
                );

        box.getCenter(
            target
        );

        controls.target.copy(
            target
        );

        controls.update();

        // =================================================
        // TACTILE
        // =================================================

        renderer.domElement.style.touchAction =
            'none';

        renderer.domElement.style.pointerEvents =
            'auto';

        // =================================================
        // CAMERA
        // =================================================

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        // =================================================
        // CRÉER ABOUT ME
        // =================================================

        createAboutMePanel();

        createNavigationUI();

      console.log(
    'Portfolio prêt.'
);

console.log(
    'ABOUT ME interactif activé.'
);

},

// =================================================
// PROGRESSION
// =================================================

(progress) => {

    if (
        progress.total > 0
    ) {

        const percent =
            (
                progress.loaded /
                progress.total
            ) * 100;

        console.log(
            `Chargement : ${percent.toFixed(0)}%`
        );

    }

},

// =================================================
// ERREUR
// =================================================

(error) => {

    console.error(
        'Erreur lors du chargement du modèle :',
        error
    );

}

);

// =====================================================
// RAYCASTER
// =====================================================

const raycaster =
    new THREE.Raycaster();

const mouse =
    new THREE.Vector2();

// =====================================================
// CLIC SUR LE PORTFOLIO
// =====================================================

renderer.domElement.addEventListener(
    'click',
    (event) => {

        // Aucun modèle chargé
        if (
            !room ||
            !camera
        ) {

            return;

        }

        // =================================================
        // POSITION DE LA SOURIS
        // =================================================

        const rect =
            renderer.domElement
                .getBoundingClientRect();

        mouse.x =
            (
                (
                    event.clientX -
                    rect.left
                ) /
                rect.width
            ) * 2 - 1;

        mouse.y =
            -(
                (
                    event.clientY -
                    rect.top
                ) /
                rect.height
            ) * 2 + 1;

        // =================================================
        // RAYCAST
        // =================================================

        raycaster.setFromCamera(
            mouse,
            camera
        );

        const intersects =
            raycaster.intersectObjects(
                room.children,
                true
            );

        if (
            !intersects.length
        ) {

            return;

        }

        // =================================================
        // OBJET TOUCHÉ
        // =================================================

        let currentObject =
            intersects[0].object;

        // =================================================
        // REMONTER LA HIÉRARCHIE BLENDER
        // =================================================

        while (
            currentObject &&
            currentObject !== room
        ) {

            const objectName =
                currentObject.name
                    ? currentObject.name.toUpperCase()
                    : '';

            console.log(
                'Objet touché :',
                currentObject.name
            );

            // =================================================
            // ABOUT ME
            // =================================================

            if (

                objectName.includes(
                    'HIT_ABOUT'
                )

                ||

                objectName.includes(
                    'INTERACTIVE_ABOUT'
                )

                ||

                objectName.includes(
                    'ABOUT_ME'
                )

            ) {

                console.log(
                    '✓ ABOUT ME détecté'
                );

                openAboutMe();

                return;

            }

            if (
                objectName.includes(
                    'HIT_PROJECT'
                )
            ) {

                openProjects();

                return;

            }

            if (
                objectName.includes(
                    'HIT_CONTACT'
                )
            ) {

                openContact();

                return;

            }

            // =================================================
            // PARENT
            // =================================================

            currentObject =
                currentObject.parent;

        }

    }
);

// =====================================================
// REDIMENSIONNEMENT
// =====================================================

window.addEventListener(
    'resize',
    () => {

        if (
            !camera
        ) {

            return;

        }

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );

    }
);

// =====================================================
// ANIMATION
// =====================================================

function animate() {

    requestAnimationFrame(
        animate
    );

    if (
        camera &&
        controls
    ) {

        navigationTimer.update();

        const delta = Math.min(
            navigationTimer.getDelta(),
            0.05
        );

        activeMoves.forEach(
            (direction) => {

                moveVisitor(
                    direction,
                    navigationSpeed * delta
                );

            }
        );

        controls.update();

        renderer.render(
            scene,
            camera
        );

    }

}

animate();
