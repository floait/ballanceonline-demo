import './main.scss'

import * as THREE from 'three';
import {add} from './wow.rs';
import * as CANNON from 'cannon';
import hotkeys from 'hotkeys-js';
import './CannonDebugRenderer';
import './GLTFLoader';
import './OrbitControls';
import Stats from 'stats-js';
// import threeToCannon from 'three-to-cannon';
// let threeToCannon = require('three-to-cannon').threeToCannon;


let world, mass, body, shape, timeStep=1/60;
let camera, scene, renderer;
let geometry, material, mesh;
let groundGeometry, groundMaterial, groundMesh;
let light;
let controls;
let cannonDebugRenderer;
let stats;
let duckShape;

initThree();
initCannon();
animate();

hotkeys('d,right', (event, handler) => {
  // Prevent the default refresh event under WINDOWS system
  event.preventDefault()
  body.velocity.set(2,0,0);
});

hotkeys('a,left', (event, handler) => {
  // Prevent the default refresh event under WINDOWS system
  event.preventDefault()
  body.velocity.set(-2,0,0);
});

hotkeys('w,up', (event, handler) => {
  // Prevent the default refresh event under WINDOWS system
  event.preventDefault()
  body.velocity.set(0,2,0);
});

hotkeys('s,down', (event, handler) => {
  // Prevent the default refresh event under WINDOWS system
  event.preventDefault()
  body.velocity.set(0,-2,0);
});

function initThree() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100 );
    // camera.position.z = 2
    camera.up.set(0,0,1);
    camera.position.set(1.5, 1.5, 1.5);
    camera.lookAt( 0, 0, 0 );


    let cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);

    var axesHelper = new THREE.AxesHelper( 5 );
    scene.add( axesHelper );

    geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
    material = new THREE.MeshNormalMaterial();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new THREE.OrbitControls( camera );
    controls.update();

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );
    // mesh.position.set(100, 100, 100)

    groundGeometry = new THREE.PlaneGeometry(4, 3, 1, 1);
    groundMaterial = new THREE.MeshLambertMaterial({ color: 0x00ffff });
    // groundMaterial = new THREE.MeshNormalMaterial();
    groundMesh = new THREE.Mesh( groundGeometry, groundMaterial );
    scene.add( groundMesh );

    // light = new THREE.PointLight( 0xff0000, 0, 2 );
    light = new THREE.AmbientLight( 0x404040 )
    light.position.set( 0, 0, 0 );
    scene.add( light );

    document.body.innerHTML = '';
    document.body.appendChild( renderer.domElement );

    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild( stats.dom );

    var loader = new THREE.GLTFLoader()

    // Load a glTF resource
    loader.load(
      // resource URL
      '/models/gltf/Duck/Duck.gltf',
      // called when the resource is loaded
      function ( gltf ) {

        scene.add( gltf.scene );

        // console.log(gltf)
        // duckShape = threeToCannon(gltf.scene.children[0])
        // console.log(duckShape);

        gltf.animations; // Array<THREE.AnimationClip>
        gltf.scene; // THREE.Scene
        gltf.scenes; // Array<THREE.Scene>
        gltf.cameras; // Array<THREE.Camera>
        gltf.asset; // Object

        initCannon();
        // initCannon(gltf);

      },
      // called while loading is progressing
      function ( xhr ) {

        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

      },
      // called when loading has errors
      function ( error ) {
        console.log(error);
        console.log( 'An error happened' );
      }
    );

    // initCannon();
}

function initCannon() {
  world = new CANNON.World();
  // world.gravity.set(0,0,0);
  world.gravity.set(0,0,-9.8);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  shape = new CANNON.Box(new CANNON.Vec3(0.2,0.2,0.2));
  // mass = 1;
  body = new CANNON.Body({
    mass: 1
  });
  body.position.set(0, 0, 4)
  body.addShape(shape);
  // body.addShape(duckShape);
  // body.angularVelocity.set(10,10,10);
  // body.angularDamping = 0.5;
  // body.velocity.set(1,0,0);
  body.linearDamping = 0.9;
  world.addBody(body);
  cannonDebugRenderer = new THREE.CannonDebugRenderer( scene, world );

  // create heightfield body
  // var matrix = [];
  // var sizeX = 15,
  //     sizeY = 15;
  // for (var i = 0; i < sizeX; i++) {
  //     matrix.push([]);
  //     for (var j = 0; j < sizeY; j++) {
  //         var height = Math.cos(i/sizeX * Math.PI * 2)*Math.cos(j/sizeY * Math.PI * 2) + 2;
  //         if(i===0 || i === sizeX-1 || j===0 || j === sizeY-1)
  //             height = 3;
  //         matrix[i].push(height);
  //     }
  // }

  // Create a plane
  var groundBody = new CANNON.Body({
    mass: 0 // mass == 0 makes the body static
  });
  var groundShape = new CANNON.Box(new CANNON.Vec3(2, 1.5, -0.1));
  groundBody.addShape(groundShape);
  world.addBody(groundBody);

  // var 

  // Create the heightfield
  // var hfShape = new CANNON.Heightfield(matrix, {
  //   elementSize: 1
  // });
  // var hfBody = new CANNON.Body({ mass: 0 });
  // hfBody.addShape(hfShape);
  // hfBody.position.set(0, 0, 0)
  // hfBody.position.set(-sizeX * hfShape.elementSize / 2, -20, -10);
  // world.addBody(hfBody);
}

function animate() {
    requestAnimationFrame( animate );
    stats.begin();
    updatePhysics();
    cannonDebugRenderer.update();
    controls.update();
    renderer.render( scene, camera );
    stats.end();
}

function updatePhysics() {
  // Step the physics world
  world.step(timeStep);
  // Copy coordinates from Cannon.js to Three.js
  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}