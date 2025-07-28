# ST Simulátor – Vizualizácia a Detekcia objektov v 3D priestore

Tento projekt predstavuje interaktívny 3D simulátor vytvorený pomocou knižnice [Three.js](https://threejs.org/) a fyzikálneho enginu [Physijs](https://github.com/chandlerprall/Physijs), s cieľom vizuálne demonštrovať pohyb objektov, senzory, dopravníky a detekciu pomocou kolíznych boxov a raycasting-u.

---

## 🎯 Hlavné funkcie

- Simulácia dopravníkov a padania objektov
- Interaktívne detekčné zóny
- Senzory s raycastingom (lúčové senzory)
- Vizualizácia hitboxov, rayov, proxy boxov (debug tools)
- Ovládanie kamery cez myš a klávesnicu (WASD + myš)
- Stavové I/O pre vstupy a výstupy

---

## 🖥️ Spustenie projektu

> **Predpoklady:**
> - Spustenie prebieha cez webový prehliadač
> - Nepotrebujete backend – ide o čisto front-end simuláciu

1. Otvor `simulator.html` v prehliadači
2. Po načítaní klikni do scény a ovládaj kameru myšou a klávesami
3. Senzory, dopravníky a interakcie sa riadia podľa `window.IO.inputs`

---

## 🎮 Ovládanie

| Akcia               | Klávesy / myš           |
|---------------------|--------------------------|
| Pohyb dopredu       | `W`                     |
| Pohyb dozadu        | `S`                     |
| Pohyb doľava        | `A`                     |
| Pohyb doprava       | `D`                     |
| Rotácia pohľadu     | `Myš (držaná + pohyb)`  |
| Aktivácia vstupu    | `window.IO.inputs` v konzole |
| Zapnutie hitboxov   | `toggleHitbox()`        |
| Zapnutie lúčov      | `toggleRayVisuals()`    |

---

## 🧪 Debugovacie nástroje

- **`showHitbox(...)`** – zobrazenie kolízneho obalu objektu
- **`showDetectionBox(...)`** – vizualizácia detekčnej zóny
- **`showRay(...)`** – vizualizácia lúča pre raycast senzor
- **`toggleHitbox()` / `toggleRayVisuals()`** – konzolové prepínače

---

## 📘 Poznámky pre ďalší vývoj

- Prepojenie so skutočným PLC simulátorom alebo digitálnym dvojčaťom

---

## 📄 Licencia

Tento projekt je vytvorený ako súčasť bakalárskej práce a slúži na edukačné účely. Ďalšie použitie konzultujte s autorom.
