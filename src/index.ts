import './style.css';
// three.js
import * as THREE from 'three';
import { Geometry, Mesh, LineBasicMaterial, Vector3, CircleBufferGeometry } from 'three';


var
    OBJLoader: any,
    OrbitControls: new (arg0: any, arg1: any) => any,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    controls: { update: () => void; },
    camera: THREE.PerspectiveCamera,
    raycaster: THREE.Raycaster = new THREE.Raycaster(),
    mouse: THREE.Vector2 = new THREE.Vector2(),
    cubes: Cube[] = new Array;


function initScene(camX: number, camY: number, camZ: number): void {
    scene = new THREE.Scene();
    scene.background = new THREE.Color("white");
    let canvas: HTMLCanvasElement = document.querySelector('#c');

    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);


    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = camX;
    camera.position.y = camY;
    camera.position.z = camZ;

    OBJLoader = require('three-obj-loader')(THREE)
    OrbitControls = require('three-orbit-controls')(THREE)
    controls = new OrbitControls(camera, renderer.domElement);
    //scene.add(new THREE.AxesHelper(1000));

    raycaster = new THREE.Raycaster(),
        mouse = new THREE.Vector2();
    renderer.domElement.addEventListener('click', raycast, false);
}


class Edge {
    v: number;  // откуда выходит ребро (куб - ориентированный граф, 24 ребра)
    line: THREE.Line;
}


class Vertice {
    verticeV3: THREE.Vector3;
    sphere: THREE.Mesh;
    color: THREE.Color; //  чтобы не было ошибок сборки при трассировке, т.к. у Object3D нет поля material

    edges: Edge[] = new Array;

    constructor(v3: THREE.Vector3) {
        this.verticeV3 = v3;
    }
}


class Cube {
    vertices: Vertice[] = [
        new Vertice(new THREE.Vector3(0, 0, 0)),    // 0
        new Vertice(new THREE.Vector3(0, 0, -1)), // 1
        new Vertice(new THREE.Vector3(1, 0, -1)), // 2
        new Vertice(new THREE.Vector3(1, 0, 0)),  // 3
        new Vertice(new THREE.Vector3(1, 1, 0)),  // 4
        new Vertice(new THREE.Vector3(0, 1, 0)),  // 5
        new Vertice(new THREE.Vector3(0, 1, -1)), // 6
        new Vertice(new THREE.Vector3(1, 1, -1)), // 7
    ];

    constructor(xOffset: number, yOffset: number, zOffset: number, size: number) {
        this.vertices.forEach((v) => {
            v.verticeV3.x = (v.verticeV3.x + xOffset) * size;
            v.verticeV3.y = (v.verticeV3.y + yOffset) * size;
            v.verticeV3.z = (v.verticeV3.z + zOffset) * size;
        });
    }
}

//  Геометрия куба
//   6+--------+7
//   /|       /|
// 5+--------+4|
//  | |      | |
//  |1+------|-+2
//  |/       |/
// 0+--------+3
//

// Список смежности вершин куба
const CUBE_EDGES = [
    [1, 3, 5],
    [0, 2, 6],
    [1, 3, 7],
    [0, 2, 4],
    [3, 5, 7],
    [0, 4, 6],
    [1, 5, 7],
    [2, 4, 6]
];


//Thanks to https://stackoverflow.com/questions/1484506/random-color-generator
function randomColor(brightness) {
    function randomChannel(brightness) {
        let r = 255 - brightness;
        let n = 0 | ((Math.random() * r) + brightness);
        let s = n.toString(16);
        return (s.length == 1) ? '0' + s : s;
    }
    return '#' + randomChannel(brightness) + randomChannel(brightness) + randomChannel(brightness);
}


function createCube(xOffset: number, yOffset: number, zOffset: number, size: number): Cube {
    let cube: Cube = new Cube(xOffset, yOffset, zOffset, size);
    for (let i = 0; i < CUBE_EDGES.length; i++) {
        for (let j = 0; j < CUBE_EDGES[i].length; j++) {
            let material = new THREE.LineBasicMaterial({ color: "black" });
            let lineGeometry = new THREE.Geometry();

            // первая вершина линии - сама вершина куба
            // вторая берется из списка смежности 
            lineGeometry.vertices.push(cube.vertices[i].verticeV3);
            lineGeometry.vertices.push(cube.vertices[CUBE_EDGES[i][j]].verticeV3);

            let edge = new Edge();
            edge.line = new THREE.Line(lineGeometry, material);
            edge.v = i;
            cube.vertices[i].edges.push(edge);
        }

        let sphereMaterial = new THREE.MeshBasicMaterial({ color: randomColor(1) })
        let sphereGeometry = new THREE.SphereGeometry(size / 10, 32, 32);
        cube.vertices[i].sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        cube.vertices[i].sphere.position.x = cube.vertices[i].verticeV3.x;
        cube.vertices[i].sphere.position.y = cube.vertices[i].verticeV3.y;
        cube.vertices[i].sphere.position.z = cube.vertices[i].verticeV3.z;
        cube.vertices[i].color = sphereMaterial.color;

    }


    cube.vertices.forEach((v) => {
        v.edges.forEach((e) => {
            scene.add(e.line);
        });
        scene.add(v.sphere);
    });

    return cube;
}


function animate() {
    requestAnimationFrame(animate);
    render();
}


function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}


function render() {
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    controls.update();
    renderer.render(scene, camera);
}


function raycast(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = 1 - (e.clientY / window.innerHeight) * 2;

    raycaster.setFromCamera(mouse, camera);

    var intersects = raycaster.intersectObjects(scene.children);

    for (var i = 0; i < intersects.length; i++) {
        if (intersects[i].face) {
            paintEdges(intersects[i].object.id);
            return; // дальше пускать луч не нужно
        }
    }
}


function paintEdges(id: number): void {
    // поиск по всем кубам и и вершинам
    cubes.forEach((cube) => {
        cube.vertices.forEach((v) => {
            if (v.sphere.id == id) {
                // по всем ребрам из вершины
                v.edges.forEach((edge) => {
                    edge.line.material = new LineBasicMaterial({ color: v.color, linewidth: 5 });
                });
            }
        });
    });
}


function rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}


function randomCubes() {
    let n = parseInt(prompt("Введите количество кубов"));
    let min = -5;
    let max = 5;
    for (let i = 0; i < n; i++) {
        cubes.push(createCube(rand(min, max), rand(min, max), rand(min, max), rand(0, max)));
    }
}


function main() {
    initScene(20, 20, -10);
    randomCubes();
    animate();
}

main();

