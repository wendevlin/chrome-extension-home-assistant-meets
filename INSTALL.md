# Schnellstart-Anleitung

Diese Anleitung führt dich durch die Installation aller Komponenten in ca. 5 Minuten.

## Voraussetzungen

- Google Chrome Browser
- Node.js (Version 14 oder höher)
- Home Assistant Installation
- Alle Komponenten müssen auf demselben Netzwerk/Host erreichbar sein

## Schritt 1: Bridge Server (2 Minuten)

```bash
# Terminal öffnen
cd bridge-server

# Abhängigkeiten installieren
npm install

# Server starten
npm start
```

**Erwartete Ausgabe:**
```
🚀 Bridge Server läuft auf http://localhost:8555
📊 Status API: http://localhost:8555/status
🔌 Connector Page: http://localhost:8555/connector
Warte auf Verbindung von Chrome Extension...
```

**Test:** Öffne `http://localhost:8555/health` - Du solltest `{"success":true,"status":"running"...}` sehen

**Tipp**: Server dauerhaft laufen lassen mit PM2:
```bash
npm install -g pm2
pm2 start index.js --name google-meets-bridge
pm2 save
pm2 startup  # Folge den Anweisungen
```

## Schritt 2: Chrome Extension (1 Minute)

1. Öffne Chrome und gehe zu `chrome://extensions/`
2. Aktiviere **"Entwicklermodus"** (Toggle oben rechts)
3. Klicke **"Entpackte Erweiterung laden"**
4. Wähle den `chrome-extension` Ordner aus diesem Projekt
5. Die Extension sollte nun in der Liste erscheinen

**Test:**
- Öffne ein Google Meets Meeting
- Öffne Chrome Developer Console (F12)
- Du solltest `"Google Meets Home Assistant Integration geladen"` sehen
- Im Terminal des Bridge Servers sollte `"Chrome Extension verbunden"` erscheinen

## Schritt 3: Home Assistant Integration (2 Minuten)

### 3a. Dateien kopieren

```bash
# Option 1: Manuell kopieren
cp -r home-assistant/custom_components/google_meets /config/custom_components/

# Option 2: Symbolischer Link (empfohlen für Entwicklung)
ln -s $(pwd)/home-assistant/custom_components/google_meets /config/custom_components/
```

### 3b. Konfiguration

Füge in `/config/configuration.yaml` hinzu:

```yaml
google_meets:
```

Oder mit custom Bridge URL:

```yaml
google_meets:
  bridge_url: http://192.168.1.100:8555
```

### 3c. Home Assistant neu starten

- **Über UI**: Einstellungen > System > Neu starten
- **Über CLI**: `ha core restart`

**Test:** Nach dem Neustart:
1. Gehe zu Entwicklertools > Zustände
2. Suche nach `google_meets`
3. Du solltest sehen:
   - `binary_sensor.google_meets_call_active`
   - `switch.google_meets_microphone`

## Schritt 4: Testen (1 Minute)

1. **Öffne ein Google Meets Meeting** in Chrome
2. **In Home Assistant**:
   - `binary_sensor.google_meets_call_active` sollte `on` sein
   - `switch.google_meets_microphone` sollte verfügbar sein
3. **Toggle den Switch**:
   - Schalte den Switch um
   - Das Mikrofon in Google Meets sollte sich ebenfalls umschalten
4. **Teste bidirektionale Sync**:
   - Klicke das Mikrofon in Google Meets
   - Der Switch in Home Assistant sollte sich automatisch aktualisieren

## Troubleshooting

### Extension verbindet sich nicht zum Server

**Symptom:** Im Terminal steht nicht "Chrome Extension verbunden"

**Lösung:**
1. Überprüfe ob der Server läuft: `http://localhost:8555/health`
2. Überprüfe die Chrome Console (F12) auf Fehler
3. Lade die Extension neu: `chrome://extensions/` > Reload Button

### Home Assistant zeigt "unavailable"

**Symptom:** Entities sind grau und zeigen "unavailable"

**Lösung:**
1. Prüfe Home Assistant Logs: Einstellungen > System > Protokolle
2. Teste Bridge Server: `curl http://localhost:8555/status`
3. Stelle sicher dass `bridge_url` korrekt ist (erreichbar von Home Assistant Host)

### Mikrofon lässt sich nicht umschalten

**Symptom:** Switch funktioniert nicht

**Lösung:**
1. Stelle sicher dass ein Call **aktiv** ist
2. Überprüfe dass das Mikrofon-Icon in Google Meets sichtbar ist
3. Prüfe Chrome Console auf Fehler
4. Versuche das Mikrofon manuell in Meets zu klicken (funktioniert das?)

## Nächste Schritte

- Siehe `README.md` für Automations-Beispiele
- Siehe `home-assistant/configuration.yaml.example` für fertige Automationen
- Erstelle ein Dashboard Widget für den Switch

## Support

Bei Problemen:
1. Prüfe die Logs aller drei Komponenten
2. Teste jeden Schritt einzeln
3. Erstelle ein GitHub Issue mit Logs und Beschreibung
