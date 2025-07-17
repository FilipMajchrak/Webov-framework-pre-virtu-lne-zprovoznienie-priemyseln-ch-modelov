import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class PhysicsBody
{
  constructor(mesh)
  {
    this.mesh = mesh;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, -9.81, 0); // gravitačné zrýchlenie
    this.mass = 1;
    this.isStatic = false; // statický objekt (napr. podložka)
  }

  update(deltaTime)
  {
    if (this.isStatic)
    {
      return; // statické objekty sa nepohybujú
    }

    // Eulerova integrácia: aktualizácia rýchlosti a pozície
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
  }

  getBoundingBox()
  {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}

export class PhysicsWorld
{
  constructor()
  {
    this.bodies = [];
  }

  addBody(body)
  {
    this.bodies.push(body);
  }

  update(deltaTime)
  {
    // Aktualizuj všetky telá (posuny podľa fyziky)
    for (const body of this.bodies)
    {
      body.update(deltaTime);
    }

    // Jednoduchá AABB kolízia medzi všetkými pármi telies
    for (let i = 0; i < this.bodies.length; i++)
    {
      for (let j = i + 1; j < this.bodies.length; j++)
      {
        const a = this.bodies[i];
        const b = this.bodies[j];

        if (a.isStatic && b.isStatic)
        {
          continue; // dva statické objekty nekolidujú
        }

        const boxA = a.getBoundingBox();
        const boxB = b.getBoundingBox();

        if (boxA.intersectsBox(boxB))
        {
          // Základné spracovanie kolízie:
          // Ak a je nad b a b je statický, zastav padanie a nastav pozíciu
          if (a.mesh.position.y > b.mesh.position.y && b.isStatic)
          {
            a.velocity.y = 0;
            a.mesh.position.y = boxB.max.y + (boxA.max.y - boxA.min.y) / 2;
          }
          else if (b.mesh.position.y > a.mesh.position.y && a.isStatic)
          {
            b.velocity.y = 0;
            b.mesh.position.y = boxA.max.y + (boxB.max.y - boxB.min.y) / 2;
          }
        }
      }
    }
  }
}