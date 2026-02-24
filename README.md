# ST Simulátor – Virtuálne sprevádzkovanie s napojením na SoftPLC

ST Simulátor je desktopová aplikácia vytvorená ako súčasť bakalárskej práce.  
Slúži na virtuálne sprevádzkovanie výrobnej linky pomocou externého SoftPLC, ktoré komunikuje so simuláciou cez Modbus TCP.

Aplikácia je distribuovaná ako `.exe` súbor a obsahuje vlastný Node.js backend.

---

## Architektúra systému

Systém pozostáva z troch hlavných častí:

### 1. 3D Simulátor

- Three.js (r124)
- Physijs (Ammo.js)
- Fyzikálna simulácia objektov
- Senzory (raycasting)
- Detekčné zóny (Box3 kolízie)
- Triedenie objektov podľa merania
- Vizualizácia vstupov a výstupov

Simulátor predstavuje digitálne dvojča riadeného procesu.

---

### 2. Backend (Node.js)

- Express server
- WebSocket komunikácia
- Modbus TCP klient (jsmodbus)
- Dynamické mapovanie I/O podľa načítanej scény

Backend zabezpečuje:

- Vytvorenie WebSocket spojenia s frontendom
- Pripojenie na Modbus server (SoftPLC)
- Synchronizáciu vstupov a výstupov medzi PLC a simuláciou
- Prenos údajov v reálnom čase

---

### 3. SoftPLC

- Externý PLC simulátor
- Riadiaca logika je implementovaná výhradne v PLC
- Komunikácia cez Modbus TCP

Simulátor nevykonáva riadiacu logiku – tú zabezpečuje SoftPLC.  
Simulácia reaguje výlučne na hodnoty prijaté z PLC.

---

## Komunikačný tok

SoftPLC  
→ Modbus TCP  
→ Node.js backend  
→ WebSocket  
→ 3D simulátor  

Výstupy zo simulácie sú spätne odosielané do PLC cez backend.

---

## Spustenie aplikácie

### EXE verzia (hlavná forma použitia)

1. Spusti `simulator.exe`
2. Backend sa automaticky inicializuje
3. V sekcii Settings nastav IP adresu a port Modbus servera
4. Spusti SoftPLC
5. Po nadviazaní spojenia je simulácia riadená PLC

---

## Vývojová verzia (Node.js)

Ak chceš projekt spustiť bez EXE:

```bash
npm install
npm start
```

Aplikácia sa spustí lokálne cez Node.js server.

---

## Konfigurácia

Nastavenia aplikácie (napr. IP adresa Modbus servera, port, ďalšie parametre) sa ukladajú do konfiguračného súboru a sú dostupné cez sekciu **Settings**.

Mapovanie I/O je viazané na aktuálne načítanú scénu a prenáša sa medzi simulátorom a backendom pri inicializácii.

---

## Účel projektu

Projekt bol vytvorený ako súčasť bakalárskej práce a slúži na demonštráciu:

- Virtuálneho sprevádzkovania
- Digitálneho dvojčaťa výrobného procesu
- Prepojenia 3D simulácie s PLC systémom
- Komunikácie cez Modbus TCP
- Real-time synchronizácie dát medzi systémami