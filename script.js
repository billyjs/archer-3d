// constants
const MIN_ARROW_POWER = 50;
const MAX_ARROWS = 10;

const MOVE_SPEED = 200.0;
const SPRINT_MODIFIER = 2;
const MOVE_REDUCTION = 10.0;

const ORB_ROT_SPEED = 5;

// ==============================================================
// resources
var soundShootFile = "resources/sounds/bow-release.wav";
var bowFile = "./bow_rigged_material.json";
var cubeMapPath = "resources/textures/cube/swedishRoyalCastle/";
var grassFile = "resources/textures/grass.jpg";

// ==============================================================
// variables

// interface
var blocker, instructions;

// camera
var camera;

// scene
var scene;

// audio
var listener, audioLoader;
var soundShoot;

// lights
var light;

// controls
var controls;

// meshes
var geometry, material, mesh, loader;
var floor;
var objects;
var trees, orbs;

// renderer
var renderer;

// bow
var drawingBow, bowPower;
var bow, skeleton;

var time;
var movement;
var velocity;

// ==============================================================
init();
animate();

// ==============================================================
function init() {
    // setup interface
    blocker = document.getElementById("blocker");
    instructions = document.getElementById("instructions");

    // setup camera
    cameraInit();

    // setup scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x010101, 0, 750);
    scene.background = new THREE.CubeTextureLoader()
        .setPath( 'resources/textures/' )
        .load( [
            'space5.png',
            'space1.png',
            'space3.png',
            'space6.png',
            'space4.png',
            'space2.png'
        ] );

    // setup mouse controls
    pointerLockInit();

    // setup audio
    audioInit();

    // setup meshes
    objects = [];
    meshesInit();

    // create trees and orbs
    trees = [];
    orbs = [];
    createTrees(100);

    // setup lights
    lightInit();

    // setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x010101);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // setup other
    time = performance.now();
    drawingBow = false;
    bowPower = 0;
    movement = {left: false, right: false, forward: false, backward: false, sprint: false};
    velocity = new THREE.Vector3();

    // setup event listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);

}

function cameraInit() {
    var aspect = window.innerWidth / window.innerHeight;
    var fov = 90; // TODO calculate dynamic fov
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
}

function pointerLockInit() {
    if ("pointerLockElement" in document === false) {
        instructions.innerHTML = "Your browser doesn't seem to support Pointer Lock API";
        return;
    }

    controls = new THREE.PointerLockControls(camera);
    scene.add(controls.getObject());

    var element = document.body;

    var pointerLockChange = function (event) {
        if (document.pointerLockElement === element) {
            controls.enabled = true;
            blocker.style.display = "none";
        } else {
            controls.enabled = false;
            blocker.style.display = "flex";
            instructions.style.display = "";
        }
    };

    var pointerLockError = function (event) {
        instructions.style.display = "";
    };

    var clickScreen = function (event) {
        instructions.style.display = "none";
        element.requestPointerLock();
        console.log("click");
    };

    document.addEventListener("pointerlockchange", pointerLockChange, false);
    document.addEventListener("pointerlockerror", pointerLockError, false);
    instructions.addEventListener("click", clickScreen, false);
}

function audioInit() {
    listener = new THREE.AudioListener();
    audioLoader = new THREE.AudioLoader();
    soundShoot = new THREE.Audio(listener);

    audioLoader.load(soundShootFile, function (buffer) {
        soundShoot.setBuffer(buffer);
        soundShoot.setLoop(false);
        soundShoot.setVolume(0.5);
    });
}

function lightInit() {
    // TODO make lights look better, shadows, etc
    light = new THREE.AmbientLight(0x404040, 0.7);
    scene.add(light);

    light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(0, 30, 0);
    light.castShadow = true;
    light.shadow.camera.near = 0.3;
    light.shadow.camera.far = 50;
    scene.add(light);
}

function meshesInit() {
    createFloorPlane();
    createTestingBox();

    createBow();
}

function createTrees(radius) {
    var files = ["./tree1.json", "./tree1.json", "./tree1.json", "./tree1.json", "./tree1.json"];
    for (var i = 0; i < files.length; i++) {
        var theta = i * 2 * Math.PI / files.length;
        var x = radius * Math.cos(theta);
        var y = radius * Math.sin(theta);
        createTree(files[i], x, y);
        createOrb(new THREE.Color().setHSL(Math.random(), 1, 0.8), x, y);
    }
}

function createTree(file, x, y) {
    var loader = new THREE.JSONLoader();
    loader.load(file, function(geometry, materials) {
        var material = new THREE.MeshPhongMaterial({
            color: 0x8B4513
        });
        var tree = new THREE.Mesh(geometry, material);
        tree.castShadow = true;
        tree.position.set(x, 0, y);
        tree.rotateY(Math.random() * 2 * Math.PI);
        scene.add(tree);
        trees.push(tree);
        objects.push(tree);
    })
}

function createOrb(color, x, y) { // 0xffec89
    var bulbGeometry = new THREE.TetrahedronGeometry(10, 0);
    var bulbLight = new THREE.PointLight(color, 1, 100, 1 );
    var bulbMat = new THREE.MeshStandardMaterial( {
        emissive: color,
        emissiveIntensity: 1,
        color: 0x000000
    });
    var orb = new THREE.Mesh( bulbGeometry, bulbMat );
    bulbLight.add(orb);
    bulbLight.position.set(x, 60, y);
    bulbLight.castShadow = true;
    scene.add(bulbLight);
    orbs.push({
        object: orb,
        rot: {
            x: Math.random() * ORB_ROT_SPEED,
            y: Math.random() * ORB_ROT_SPEED,
            z: Math.random() * ORB_ROT_SPEED
        }
    });
    objects.push(orb)
}

function createBow() {
    loader = new THREE.JSONLoader();
    loader.load(bowFile, loadBow);
}

function loadBow(geometry, materials) {
    var format = '.jpg';
    var urls = [
        cubeMapPath + 'px' + format, cubeMapPath + 'nx' + format,
        cubeMapPath + 'py' + format, cubeMapPath + 'ny' + format,
        cubeMapPath + 'pz' + format, cubeMapPath + 'nz' + format
    ];
    var reflectionCube = new THREE.CubeTextureLoader().load( urls );
    var material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 1.0,
        skinning: true,
        side: THREE.DoubleSide,
        shading: THREE.FlatShading,
        envMap: reflectionCube,
        envMapIntensity: 0.3
    });
    bow = new THREE.SkinnedMesh(geometry, material);
    camera.add(bow);
    skeleton = new THREE.SkeletonHelper(bow);
    skeleton.bones[0].position.set(1,0,-4);
    skeleton.bones[0].rotation.set(0,Math.PI/2,0);
    // skeleton.bones[19].position.set(-1,0,0);
}

function createFloorPlane() {
    // var geo = new THREE.PlaneGeometry(200,200,100,100);
    // var tloader = new THREE.TextureLoader();
    // var dloader = new THREE.TextureLoader();
    // var nloader = new THREE.TextureLoader();
    // dloader.load( 'resources/textures/grass_DISP.png', function (displacementMap) {
    //     displacementMap.wrapS = THREE.RepeatWrapping;
    //     displacementMap.wrapT = THREE.RepeatWrapping;
    //     displacementMap.repeat.x = 10;
    //     displacementMap.repeat.y = 10;
    //     nloader.load( 'resources/textures/grass_NRM.png', function (normalMap) {
    //         normalMap.wrapS = THREE.RepeatWrapping;
    //         normalMap.wrapT = THREE.RepeatWrapping;
    //         normalMap.repeat.x = 10;
    //         normalMap.repeat.y = 10;
    //         tloader.load(grassFile, function (texture) {
    //             texture.wrapS = THREE.RepeatWrapping;
    //             texture.wrapT = THREE.RepeatWrapping;
    //             texture.repeat.x = 10;
    //             texture.repeat.y = 10;
    //             var mat = new THREE.MeshPhongMaterial({
    //                 map: texture,
    //                 displacementMap: displacementMap,
    //                 displacementScale: 2,
    //                 normalMap: normalMap
    //             });
    //             geo.rotateX(-Math.PI/2);
    //             // for (var i = 0, l = geometry.faces.length; i < l; i++) {
    //             //     var face = geometry.faces[i];
    //             //     face.vertexColors[0] = new THREE.Color().setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    //             //     face.vertexColors[1] = new THREE.Color().setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    //             //     face.vertexColors[2] = new THREE.Color().setHSL(Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75);
    //             // }
    //             // material = new THREE.MeshPhongMaterial({vertexColors: THREE.VertexColors});
    //             floor = new THREE.Mesh(geo, mat);
    //             floor.castShadow = true;
    //             floor.receiveShadow = true;
    //             scene.add(floor);
    //         });
    //     });
    // });
    geometry = new THREE.PlaneGeometry(500,500,200,200);
    geometry.rotateX(-Math.PI/2);
    for (var i = 0, l = geometry.faces.length; i < l; i++) {
        var face = geometry.faces[i];
        face.vertexColors[0] = new THREE.Color().setHSL(Math.random() * 0.15 + 0.35, 0.75, Math.random() * 0.45 + 0.15);
        face.vertexColors[1] = new THREE.Color().setHSL(Math.random() * 0.15 + 0.35, 0.75, Math.random() * 0.45 + 0.15);
        face.vertexColors[2] = new THREE.Color().setHSL(Math.random() * 0.15 + 0.35, 0.75, Math.random() * 0.45 + 0.15);
    }
    for ( var i = 0, l = geometry.vertices.length; i < l; i ++ ) {
        var vertex = geometry.vertices[ i ];
        vertex.x += Math.random() * 2 - 1;
        vertex.y += Math.random() * 2;
        vertex.z += Math.random() * 2 - 1;
    }
    material = new THREE.MeshPhongMaterial({vertexColors: THREE.VertexColors});
    floor = new THREE.Mesh(geometry, material);
    floor.receiveShadow = true;
    scene.add(floor);
}

function createTestingBox() {
    geometry = new THREE.BoxGeometry(10, 10, 10);
    material = new THREE.MeshPhongMaterial({color: 0x00ff00});
    var cube = new THREE.Mesh(geometry, material);
    cube.position.set(0,10,0);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
    objects.push(cube);
}

function onMouseDown(event) {
    switch (event.button) {
        case 0: // left
            drawingBow = true;
            break;
        case 2: // right
            drawingBow = false;
            bowPower = 0; // reduce power so arrow doesn't fire
            break;
    }

}

function onMouseUp(event) {
    switch (event.button) {
        case 0: //left
            drawingBow = false;
            break;
    }
}

function onKeyDown(event) {
    switch (event.keyCode) {
        case 16:
            movement.sprint = true;
            break;
        case 38: // up
        case 87: // w
            movement.forward = true;
            break;
        case 37: // left
        case 65: // a
            movement.left = true;
            break;
        case 40: // down
        case 83: // s
            movement.backward = true;
            break;
        case 39: // right
        case 68: // d
            movement.right = true;
            break;
//            case 32: // space
//                if (jumping === false) velocity.y += 350;
//                canJump = false;
//                break;
    }
}

function onKeyUp(event) {
    switch (event.keyCode) {
        case 16:
            movement.sprint = false;
            break;
        case 38: // up
        case 87: // w
            movement.forward = false;
            break;
        case 37: // left
        case 65: // a
            movement.left = false;
            break;
        case 40: // down
        case 83: // s
            movement.backward = false;
            break;
        case 39: // right
        case 68: // d
            movement.right = false;
            break;
    }
}

function onWindowResize(event) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls.enabled) {
        update();
    }
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
}

function positionBow(power) {
    // power 0-100
    var string = (2 * power / - 100) - 1;
    var rot = 0.15;
    skeleton.bones[19].position.set(string,0,0);
    skeleton.bones[2].rotation.z = power * rot / 100;
    skeleton.bones[3].rotation.z = power * rot / 100;
    skeleton.bones[4].rotation.z = power * rot / 100;
    skeleton.bones[5].rotation.z = power * rot / 100;
    skeleton.bones[6].rotation.z = power * rot / 100;

    skeleton.bones[11].rotation.z = power * -rot / 100;
    skeleton.bones[12].rotation.z = power * -rot / 100;
    skeleton.bones[13].rotation.z = power * -rot / 100;
    skeleton.bones[14].rotation.z = power * -rot / 100;
    skeleton.bones[15].rotation.z = power * -rot / 100;
}

function fireArrow() {
    console.log("fired");
    soundShoot.play();
    bowPower = 0;
    positionBow(bowPower);
}

function update() {
    var now = performance.now();
    var delta = (now - time) / 1000;

    // movement reduction
    velocity.z -= velocity.z * MOVE_REDUCTION * delta;
    velocity.x -= velocity.x * MOVE_REDUCTION * delta;

    // draw bow
    if (drawingBow) {
        bowPower = Math.min(bowPower + 100 * delta, 100);
        positionBow(bowPower);
    } else if (bowPower > MIN_ARROW_POWER) {
        fireArrow();
    } else {
        bowPower = 0;
        positionBow(bowPower);
    }

    // update player movement
    var speed = movement.speed ? MOVE_SPEED : MOVE_SPEED * SPRINT_MODIFIER;

    if (movement.forward) {
        velocity.z -= speed * delta;
    }

    if (movement.backward) {
        velocity.z += speed * delta;
    }

    if (movement.left) {
        velocity.x -= speed * delta;
    }

    if (movement.right) {
        velocity.x += speed * delta;
    }

    // update player position
    controls.getObject().translateZ(velocity.z * delta);
    controls.getObject().translateX(velocity.x * delta);

    // distort orbs
    // distortTetrahedron(orbs[0], 250*delta, 250);
    for (var i = 0; i < orbs.length; i++) {
        orbs[i].object.rotation.x += orbs[i].rot.x * delta;
        orbs[i].object.rotation.y += orbs[i].rot.y * delta;
        orbs[i].object.rotation.z += orbs[i].rot.z * delta;
    }



    time = now;
}

function glitchSphere(radius, widthSegments, heightSegments, randomness) {
    var geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    for ( var i = 0, l = geometry.vertices.length; i < l; i ++ ) {
        var v = geometry.vertices[ i ];
        var dist = Math.pow(v.x, 2) + Math.pow(v.y, 2) + Math.pow(v.z, 2);
        console.log(dist);
        // vertex.x += Math.random() * randomness - randomness/2;
        // vertex.y += Math.random() * randomness - randomness/2;
        // vertex.z += Math.random() * randomness - randomness/2;
    }
    return geometry;
}

function distortTetrahedron(geometry, randomness, max) {
    for ( var i = 0, l = geometry.vertices.length; i < l; i ++ ) {
        var v = geometry.vertices[i];
        var dist = 0;
        var x, y, z;
        do {
            var x = v.x + Math.random() * randomness - randomness/2;
            var y = v.y + Math.random() * randomness - randomness/2;
            var z = v.z + Math.random() * randomness - randomness/2;
            dist = Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2);
        } while (dist > max);
        v.x = x;
        v.y = y;
        v.z = z;
    }
    geometry.verticesNeedUpdate = true;
}