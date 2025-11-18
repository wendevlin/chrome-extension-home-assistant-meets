# Google Meets Home Assistant Integration

Eine vollständige Integration von Google Meets in Home Assistant mit Chrome Extension. Steuere dein Mikrofon in Google Meets direkt aus Home Assistant - **OHNE** zusätzlichen Bridge Server!

## Features

- ✅ **Call Status**: Binary Sensor zeigt an ob ein Google Meets Call aktiv ist
- ✅ **Mikrofon Steuerung**: Toggle Switch für das Mikrofon (stumm/aktiv)
- ✅ **Bidirektionale Synchronisation**: Status wird in Echtzeit synchronisiert
- ✅ **Auto-Unavailable**: Switch ist automatisch nicht verfügbar wenn kein Call aktiv ist
- ✅ **Multi-Tab Support**: Bei mehreren Meets Tabs wird automatisch der erste aktive verwendet
- ✅ **Direkte Verbindung**: Extension verbindet sich direkt zur Home Assistant WebSocket API
- ✅ **Kein Bridge Server nötig**: Einfache 2-Komponenten Architektur

## Architektur

Das System besteht aus nur **zwei** Komponenten:

1. **Chrome Extension**: Überwacht Google Meets und sendet Status-Updates an Home Assistant
2. **Home Assistant Integration**: Custom Component mit Sensor und Switch

```
┌─────────────────┐                                  ┌─────────────────┐
│ Chrome Extension│◄─────────────────────────────────┤ Home Assistant  │
│  (Google Meets) │   WebSocket API (direkt!)        │   Integration   │
└─────────────────┘                                  └─────────────────┘
```

Die Extension verbindet sich **direkt** zur Home Assistant WebSocket API - kein Node.js Server, kein HTTP Bridge, nichts dazwischen!

## Installation

### 1. Chrome Extension installieren

1. Navigiere zum `chrome-extension` Verzeichnis
2. Öffne Chrome und gehe zu `chrome://extensions/`
3. Aktiviere "Entwicklermodus" (Developer mode) oben rechts
4. Klicke "Entpackte Erweiterung laden" (Load unpacked)
5. Wähle den `chrome-extension` Ordner aus

### 2. Extension konfigurieren

1. Klicke auf das Extension-Icon in Chrome
2. Klicke "Details" → "Erweiterungsoptionen"
3. Trage deine Home Assistant URL ein:
   - Standard: `ws://homeassistant.local:8123/api/websocket`
   - HTTPS: `wss://your-domain.com/api/websocket`
4. Erstelle einen Long-Lived Access Token in Home Assistant:
   - Profil → Sicherheit → Long-Lived Access Tokens
5. Kopiere den Token in die Extension-Optionen
6. Speichern - fertig!

### 3. Home Assistant Integration installieren

1. Kopiere den `home-assistant/custom_components/google_meets` Ordner nach:
   ```
   /config/custom_components/google_meets/
   ```

2. Füge in deiner `configuration.yaml` hinzu:
   ```yaml
   google_meets:
   ```

3. Starte Home Assistant neu

**Das war's!** Keine weiteren Abhängigkeiten, kein Bridge Server, nichts zu installieren.

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

### Services

Die Integration stellt folgende Services bereit:

#### `google_meets.toggle_microphone`
Schaltet das Mikrofon um (stumm ↔ aktiv)

```yaml
service: google_meets.toggle_microphone
```

#### `google_meets.set_microphone`
Setzt das Mikrofon auf einen spezifischen Status

```yaml
service: google_meets.set_microphone
data:
  muted: true  # true = stumm, false = aktiv
```

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

Mehr Beispiele findest du in `home-assistant/configuration.yaml.example`

## Troubleshooting

### Chrome Extension verbindet sich nicht

1. Überprüfe die WebSocket URL in den Extension-Optionen
2. Überprüfe dass der Access Token gültig ist
3. Öffne die Chrome Developer Console (F12) und prüfe auf Fehler
4. Stelle sicher dass WebSocket Verbindungen zu Home Assistant erlaubt sind

### Home Assistant zeigt "unavailable"

1. Prüfe ob die Chrome Extension läuft und verbunden ist (Console Logs)
2. Prüfe die Home Assistant Logs: `Settings > System > Logs`
3. Stelle sicher dass die Integration korrekt geladen wurde

### Mikrofon lässt sich nicht umschalten

1. Stelle sicher dass ein Google Meets Call aktiv ist
2. Überprüfe ob das Mikrofon-Button in Meets sichtbar ist
3. Prüfe die Browser Console auf Fehler

## Vorteile der neuen Architektur

**Alte Version** (mit Bridge Server):
- 3 Komponenten: Extension → Node.js Bridge → Home Assistant
- Bridge Server muss laufen (Node.js, npm, PM2, etc.)
- Zusätzliche Fehlerquelle
- Komplexere Installation

**Neue Version** (direkt):
- 2 Komponenten: Extension ↔ Home Assistant
- Keine zusätzlichen Services
- Einfachere Installation
- Weniger Fehlerquellen
- Nutzt offizielle Home Assistant WebSocket API

## Entwicklung

### Chrome Extension

Die Extension besteht aus:
- `manifest.json`: Extension Konfiguration
- `content.js`: Script das in Google Meets Tabs läuft
- `background.js`: Service Worker für WebSocket Verbindung zu Home Assistant
- `options.html/js`: Einstellungsseite für URL und Token

### Home Assistant Integration

Die Integration nutzt:
- Event-basierte Architektur (kein Polling!)
- `google_meets_state` Events von der Extension
- `google_meets_command` Events an die Extension
- `BinarySensorEntity` für Call Status
- `SwitchEntity` für Mikrofon Steuerung

## Lizenz

MIT License - siehe LICENSE Datei

## Beiträge

Pull Requests sind willkommen! Für größere Änderungen bitte zuerst ein Issue öffnen.
