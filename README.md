# ST Simulátor -- Vizualizácia a Detekcia objektov v 3D priestore

Tento projekt predstavuje interaktívny 3D simulátor vytvorený pomocou
knižnice [Three.js](https://threejs.org/) a fyzikálneho enginu
[Physijs](https://github.com/chandlerprall/Physijs), s cieľom vizuálne
demonštrovať pohyb objektov, senzory, dopravníky a detekciu pomocou
kolíznych boxov a raycasting-u.

------------------------------------------------------------------------

## 🎯 Hlavné funkcie

-   Simulácia dopravníkov a padania objektov\
-   Interaktívne detekčné zóny\
-   Senzory s raycastingom (lúčové senzory)\
-   Vizualizácia hitboxov, rayov, proxy boxov (debug tools)\
-   Ovládanie kamery cez myš a klávesnicu (WASD + myš)\
-   Stavové I/O pre vstupy a výstupy

------------------------------------------------------------------------

## 🖥️ Spustenie projektu (web verzia)

> **Predpoklady:** - Spustenie prebieha cez webový prehliadač\
> - Nepotrebujete backend -- ide o čisto front-end simuláciu

1.  Otvor `simulator.html` v prehliadači\
2.  Po načítaní klikni do scény a ovládaj kameru myšou a klávesami\
3.  Senzory, dopravníky a interakcie sa riadia podľa `window.IO.inputs`

------------------------------------------------------------------------

## ⚡ Spustenie EXE verzie (branch `experimental-exe`)

V branchi **`experimental-exe`** sa nachádza **zabalená aplikácia** vo
forme spustiteľného súboru.

👉 Postup:\
1. Na GitHube si prepni branch na **`experimental-exe`**\
2. Stiahni celý obsah projektu (`Code` → `Download ZIP`)\
3. Rozbaľ archív\
4. Spusti súbor **`simulator.exe`**

> Tento `.exe` súbor bol vytvorený pomocou **Node.js** a knižnice
> **pkg**, ktorá zabalila celý projekt do jednej aplikácie.

------------------------------------------------------------------------

## 🎮 Ovládanie

  Akcia                         Klávesy / myš
  ----------------------------- ------------------------------
  Pohyb dopredu                 `W`
  Pohyb dozadu                  `S`
  Pohyb doľava                  `A`
  Pohyb doprava                 `D`
  Rotácia pohľadu               `Myš (držaná + pohyb)`
  Ukončenie ovládania pohľadu   `ESC` (uvoľní myš)
  Zapnutie hitboxov             `toggleHitbox()`
  Zapnutie lúčov                `toggleRayVisuals()`
  Aktivácia I/O tlačidiel       Tlačidlá v ľavom paneli HMI
  Aktivácia vstupu              `window.IO.inputs` v konzole

------------------------------------------------------------------------

## 🧪 Debugovacie nástroje

-   **`showHitbox(...)`** -- zobrazenie kolízneho obalu objektu\
-   **`showDetectionBox(...)`** -- vizualizácia detekčnej zóny\
-   **`showRay(...)`** -- vizualizácia lúča pre raycast senzor\
-   **`toggleHitbox()` / `toggleRayVisuals()`** -- konzolové prepínače

------------------------------------------------------------------------

## 📘 Poznámky pre ďalší vývoj

-   Možnosť pridať animované stroje, ventily alebo manipulátory\
-   Import ďalších `.obj` modelov\
-   Prepojenie so skutočným PLC simulátorom alebo digitálnym dvojčaťom

------------------------------------------------------------------------

## 📄 Licencia

Tento projekt je vytvorený ako súčasť bakalárskej práce a slúži na
edukačné účely. Ďalšie použitie konzultujte s autorom.
