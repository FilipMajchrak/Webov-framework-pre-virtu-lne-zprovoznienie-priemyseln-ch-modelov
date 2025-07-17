import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export function createDetectionBox({width,height,depth,scene,position = [0, 0, 0],color = 0x00ffff,opacity = 0.2})
{
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: true,
        wireframe: true
    });

    material.visible = false; //skrité zobrazenie mesh

    const mesh = new THREE.Mesh(geometry, material);

    if (position instanceof THREE.Vector3) {
        mesh.position.copy(position);
    } else if (Array.isArray(position)) {
        mesh.position.set(position[0], position[1], position[2]);
    }

    scene.add(mesh);
    

    const box3 = new THREE.Box3();

    let inside = false; // stav či je vnútri

    return {
        mesh,
        box3,
        update() {
        mesh.updateMatrixWorld(true);
        box3.setFromObject(mesh);
        },
        /**
         * Skontroluje prienik. 
         * Vracia:
         *  true  => práve vošiel (prechod von → dnu)
         *  false => práve vyšiel (prechod dnu → von)
         *  null  => stav sa nezmenil
         */
        checkContains(other) {
        const otherBox3 = new THREE.Box3().setFromObject(other);
        const intersects = box3.intersectsBox(otherBox3);

        if (intersects && !inside) {
            inside = true;
            return true; // Práve vošiel
        }
        if (!intersects && inside) {
            inside = false;
            return false; // Práve vyšiel
        }
        return null; // Stav sa nezmenil
        }
    };
}