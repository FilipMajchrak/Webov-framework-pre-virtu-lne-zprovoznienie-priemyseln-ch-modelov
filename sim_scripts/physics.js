import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

export class PhysicsBody
{
  constructor(mesh)
  {
    this.mesh = mesh;

    // Počiatočná rýchlosť a zrýchlenie
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.acceleration = new THREE.Vector3(0, -9.81, 0); // gravitačné zrýchlenie

    this.mass = 1;
    this.isStatic = false; // statický objekt sa nepohybuje

    this.linearDamping = 0.1;        // odpor pohybu
    this.surfaceFriction = 0.1;      // trenie platformy
  }

  update(deltaTime)
  {
    if (this.isStatic)
    {
      return; // statické objekty sa nepohybujú
    }

    // Aktualizuj rýchlosť vplyvom zrýchlenia
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));

    // Aplikuj tlmenie (zotrvačnosť)
    const dampingFactor = 1 - this.linearDamping;
    this.velocity.multiplyScalar(Math.pow(dampingFactor, deltaTime));

    // Aktualizuj pozíciu podľa rýchlosti
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
    // Aktualizuj pohyb všetkých telies
    for (const body of this.bodies)
    {
      body.update(deltaTime);
    }

    // Jednoduchá detekcia AABB kolízií medzi všetkými pármi telies
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

        const tolerance = 0.05; // maximálna vzdialenosť medzi objektmi pri dotyku

        if (boxA.intersectsBox(boxB))
        {
          // A dopadá na B
          if (
            a.mesh.position.y > b.mesh.position.y &&
            b.isStatic &&
            a.velocity.y <= 0 &&
            Math.abs(boxA.min.y - boxB.max.y) < tolerance
          )
          {
            // zastav pád a zarovnaj výšku
            a.velocity.y = 0;
            a.mesh.position.y = boxB.max.y + (boxA.max.y - boxA.min.y) / 2;

            // nastav trenie z povrchu B
            if (typeof b.surfaceFriction === 'number')
            {
              a.linearDamping = b.surfaceFriction;
            }
          }

          // B dopadá na A
          else if (
            b.mesh.position.y > a.mesh.position.y &&
            a.isStatic &&
            b.velocity.y <= 0 &&
            Math.abs(boxB.min.y - boxA.max.y) < tolerance
          )
          {
            b.velocity.y = 0;
            b.mesh.position.y = boxA.max.y + (boxB.max.y - boxB.min.y) / 2;

            if (typeof a.surfaceFriction === 'number')
            {
              b.linearDamping = a.surfaceFriction;
            }
          }
        }
      }
    }
  }
}