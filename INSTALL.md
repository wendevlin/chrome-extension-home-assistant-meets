# Schnellstart-Anleitung

Diese Anleitung führt dich durch die Installation aller Komponenten in ca. **3 Minuten**.

## Voraussetzungen

- Google Chrome Browser
- Home Assistant Installation
- Zugriff auf Home Assistant WebSocket API

## Schritt 1: Chrome Extension (1 Minute)

1. Öffne Chrome und gehe zu `chrome://extensions/`
2. Aktiviere **"Entwicklermodus"** (Toggle oben rechts)
3. Klicke **"Entpackte Erweiterung laden"**
4. Wähle den `chrome-extension` Ordner aus diesem Projekt
5. Die Extension sollte nun in der Liste erscheinen

**Test:** Die Extension ist jetzt installiert! Sie benötigt aber noch Konfiguration.

## Schritt 2: Extension Konfiguration (1 Minute)

### 2a. Access Token erstellen

1. Öffne Home Assistant
2. Gehe zu **Profil** (unten links, dein Name)
3. Scrolle zu **Sicherheit**
4. Unter **Long-Lived Access Tokens** klicke **"Token erstellen"**
5. Gib einen Namen ein (z.B. "Google Meets Extension")
6. **Kopiere den Token** - er wird nur einmal angezeigt!

### 2b. Extension konfigurieren

1. Gehe zurück zu `chrome://extensions/`
2. Finde die "Google Meets Home Assistant Integration"
3. Klicke **"Details"**
4. Klicke **"Erweiterungsoptionen"**
5. Trage ein:
   - **WebSocket URL**: `ws://homeassistant.local:8123/api/websocket`
     - HTTPS? Nutze: `wss://your-domain.com/api/websocket`
     - Andere IP? Nutze: `ws://192.168.1.100:8123/api/websocket`
   - **Access Token**: Den kopierten Token von oben
6. Klicke **"Einstellungen speichern"**

**Test:**
- Öffne ein Google Meets Meeting
- Öffne Chrome Console (F12)
- Du solltest `"✅ Verbunden mit Home Assistant"` sehen
- Dann: `"✅ Authentifizierung erfolgreich"`

## Schritt 3: Home Assistant Integration (1 Minute)

### 3a. Dateien kopieren

```bash
# Kopiere die Integration
cp -r home-assistant/custom_components/google_meets /config/custom_components/

# Oder als symbolischer Link (empfohlen für Entwicklung)
ln -s $(pwd)/home-assistant/custom_components/google_meets /config/custom_components/
```

### 3b. Konfiguration

Füge in `/config/configuration.yaml` hinzu:

```yaml
google_meets:
```

Das ist **alles**! Keine weiteren Einstellungen nötig.

### 3c. Home Assistant neu starten

- **Über UI**: Einstellungen > System > Neu starten
- **Über CLI**: `ha core restart`

**Test:** Nach dem Neustart:
1. Gehe zu **Entwicklertools > Zustände**
2. Suche nach `google_meets`
3. Du solltest sehen:
   - `binary_sensor.google_meets_call_active` (off/unavailable)
   - `switch.google_meets_microphone` (off/unavailable)

## Schritt 4: Testen (30 Sekunden)

1. **Öffne ein Google Meets Meeting** in Chrome (mit Kamera/Mikrofon)

2. **In Home Assistant**:
   - `binary_sensor.google_meets_call_active` sollte `on` sein
   - `switch.google_meets_microphone` sollte verfügbar sein
   - Status zeigt aktuellen Mikrofon-Zustand

3. **Toggle den Switch**:
   - Schalte den Switch in Home Assistant um
   - Das Mikrofon in Google Meets sollte sich **sofort** umschalten

4. **Teste bidirektionale Sync**:
   - Klicke das Mikrofon **in Google Meets**
   - Der Switch in Home Assistant sollte sich **automatisch** aktualisieren

**Funktioniert alles?** 🎉 Installation erfolgreich!

## Häufige Probleme

### Extension verbindet sich nicht

**Symptom:** Console zeigt "❌ Authentifizierung fehlgeschlagen"

**Lösung:**
1. Prüfe ob der Access Token korrekt kopiert wurde
2. Erstelle einen neuen Token in Home Assistant
3. Stelle sicher dass die WebSocket URL korrekt ist

### "WebSocket Fehler" in Console

**Symptom:** Console zeigt WebSocket Fehler

**Lösung:**
1. Prüfe ob Home Assistant erreichbar ist
2. Teste die URL im Browser: `http://homeassistant.local:8123`
3. Bei HTTPS: Nutze `wss://` statt `ws://`
4. Prüfe Firewall-Regeln

### Home Assistant Entities sind "unavailable"

**Symptom:** Entities zeigen "unavailable"

**Lösung:**
1. Prüfe ob die Extension verbunden ist (Chrome Console)
2. Öffne ein Google Meets Meeting
3. Prüfe Home Assistant Logs: Einstellungen > System > Protokolle
4. Suche nach Fehlern mit "google_meets"

### Mikrofon lässt sich nicht umschalten

**Symptom:** Switch reagiert nicht

**Lösung:**
1. Stelle sicher dass ein Call **aktiv** ist (kamera an, im Meeting)
2. Prüfe ob das Mikrofon-Button in Meets sichtbar ist
3. Versuche das Mikrofon manuell in Meets zu klicken (funktioniert das?)
4. Prüfe Chrome Console auf JavaScript-Fehler

## Was passiert im Hintergrund?

1. **Extension startet** → Verbindet zu Home Assistant WebSocket
2. **Authentifizierung** → Mit Long-Lived Access Token
3. **Event Subscription** → Extension hört auf `google_meets_command` Events
4. **Status Updates** → Extension sendet alle 5 Sekunden `google_meets_state` Events
5. **Command Handling** → Home Assistant sendet Commands, Extension führt aus

## Nächste Schritte

- ✅ Siehe `README.md` für Automations-Beispiele
- ✅ Siehe `home-assistant/configuration.yaml.example` für fertige Automationen
- ✅ Erstelle ein Dashboard Widget für den Switch
- ✅ Richte Benachrichtigungen für Call-Start/-Ende ein

## Unterschied zur alten Version

**WICHTIG:** Falls du eine ältere Version mit Bridge Server hattest:

**Alt (v1.0):**
- Chrome Extension → Bridge Server (Node.js) → Home Assistant
- Bridge Server musste laufen (`npm start`, PM2, etc.)
- HTTP API auf Port 8555

**Neu (v2.0):**
- Chrome Extension ↔ Home Assistant (direkt!)
- Kein Bridge Server mehr nötig
- Nutzt native Home Assistant WebSocket API
- Einfachere Installation, weniger Fehlerquellen

Der Bridge Server (`bridge-server/` Ordner) wird **nicht mehr benötigt** und kann ignoriert werden!

## Support

Bei Problemen:
1. Prüfe die Logs aller Komponenten (Chrome Console + HA Logs)
2. Teste jeden Schritt einzeln
3. Erstelle ein GitHub Issue mit Logs und Beschreibung

**Viel Erfolg!** 🚀
