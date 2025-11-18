# Google Meets Home Assistant Integration

Eine vollständige Integration von Google Meets in Home Assistant mit Chrome Extension. Steuere dein Mikrofon in Google Meets direkt aus Home Assistant!

## Features

- ✅ **Call Status**: Binary Sensor zeigt an ob ein Google Meets Call aktiv ist
- ✅ **Mikrofon Steuerung**: Toggle Switch für das Mikrofon (stumm/aktiv)
- ✅ **Bidirektionale Synchronisation**: Status wird in Echtzeit synchronisiert
- ✅ **Auto-Unavailable**: Switch ist automatisch nicht verfügbar wenn kein Call aktiv ist
- ✅ **Multi-Tab Support**: Bei mehreren Meets Tabs wird automatisch der erste aktive verwendet

## Architektur

Das System besteht aus drei Komponenten:

1. **Chrome Extension**: Überwacht Google Meets und steuert das Mikrofon
2. **Bridge Server**: Node.js Server der zwischen Extension und Home Assistant vermittelt
3. **Home Assistant Integration**: Custom Component mit Sensor und Switch

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│ Chrome Extension│◄────────┤ Bridge Server├────────►│ Home Assistant  │
│  (Google Meets) │WebSocket│   (Node.js)  │  HTTP   │   Integration   │
└─────────────────┘         └──────────────┘         └─────────────────┘
```

## Installation

### 1. Chrome Extension installieren

1. Navigiere zum `chrome-extension` Verzeichnis
2. Öffne Chrome und gehe zu `chrome://extensions/`
3. Aktiviere "Entwicklermodus" (Developer mode) oben rechts
4. Klicke "Entpackte Erweiterung laden" (Load unpacked)
5. Wähle den `chrome-extension` Ordner aus

### 2. Bridge Server installieren und starten

```bash
cd bridge-server
npm install
npm start
```

Der Server läuft nun auf `http://localhost:8555`

**Optional**: Verwende PM2 für automatischen Start:

```bash
npm install -g pm2
pm2 start index.js --name google-meets-bridge
pm2 save
pm2 startup
```

### 3. Home Assistant Integration installieren

1. Kopiere den `home-assistant/custom_components/google_meets` Ordner nach:
   ```
   /config/custom_components/google_meets/
   ```

2. Füge in deiner `configuration.yaml` hinzu:
   ```yaml
   google_meets:
     bridge_url: http://localhost:8555  # Optional, wenn auf anderem Host
   ```

3. Starte Home Assistant neu

## Verwendung

### Entities

Nach der Installation stehen folgende Entities zur Verfügung:

#### Binary Sensor: `binary_sensor.google_meets_call_active`
- **Status**: `on` wenn ein Call aktiv ist, sonst `off`
- **Attributes**:
  - `mic_muted`: Status des Mikrofons
  - `last_update`: Zeitstempel des letzten Updates
  - `connected`: Verbindungsstatus zur Chrome Extension

#### Switch: `switch.google_meets_microphone`
- **Status**: `on` = Mikrofon aktiv, `off` = Mikrofon stumm
- **Availability**: Nur verfügbar wenn ein Call aktiv ist
- **Bidirektional**: Status wird automatisch synchronisiert

### Automationen

Beispiel: Mikrofon stumm schalten wenn jemand an der Tür klingelt:

```yaml
automation:
  - alias: "Mute Mic on Doorbell"
    trigger:
      - platform: state
        entity_id: binary_sensor.doorbell
        to: "on"
    condition:
      - condition: state
        entity_id: binary_sensor.google_meets_call_active
        state: "on"
    action:
      - service: switch.turn_off
        target:
          entity_id: switch.google_meets_microphone
```

Beispiel: Benachrichtigung wenn Call startet:

```yaml
automation:
  - alias: "Notify on Call Start"
    trigger:
      - platform: state
        entity_id: binary_sensor.google_meets_call_active
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          message: "Google Meets Call gestartet"
```

## Troubleshooting

### Chrome Extension verbindet sich nicht

1. Überprüfe ob der Bridge Server läuft: `http://localhost:8555/health`
2. Öffne die Chrome Developer Console (F12) und prüfe auf Fehler
3. Stelle sicher dass WebSocket Verbindungen erlaubt sind

### Home Assistant zeigt "unavailable"

1. Überprüfe ob der Bridge Server erreichbar ist
2. Prüfe die Home Assistant Logs: `Settings > System > Logs`
3. Stelle sicher dass die `bridge_url` korrekt konfiguriert ist

### Mikrofon lässt sich nicht umschalten

1. Stelle sicher dass ein Google Meets Call aktiv ist
2. Überprüfe ob das Mikrofon-Button in Meets sichtbar ist
3. Prüfe die Browser Console auf Fehler

## Entwicklung

### Chrome Extension

Die Extension besteht aus:
- `manifest.json`: Extension Konfiguration
- `content.js`: Script das in Google Meets Tabs läuft
- `background.js`: Service Worker für Koordination und WebSocket Verbindung

### Bridge Server

Der Server stellt folgende Endpunkte bereit:
- `GET /status`: Aktueller Status
- `POST /toggle`: Mikrofon umschalten
- `POST /set`: Mikrofon auf spezifischen Status setzen
- `GET /health`: Health Check

### Home Assistant Integration

Die Integration nutzt:
- `DataUpdateCoordinator` für regelmäßige Status Updates (alle 2 Sekunden)
- `BinarySensorEntity` für Call Status
- `SwitchEntity` für Mikrofon Steuerung

## Lizenz

MIT License - siehe LICENSE Datei

## Beiträge

Pull Requests sind willkommen! Für größere Änderungen bitte zuerst ein Issue öffnen.
