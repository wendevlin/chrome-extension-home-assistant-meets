# ⚠️ DEPRECATED - Bridge Server nicht mehr benötigt!

**Stand: Version 2.0**

Der Bridge Server wird **nicht mehr benötigt** und wurde durch eine direkte Verbindung zwischen Chrome Extension und Home Assistant ersetzt.

## Was hat sich geändert?

**Alte Architektur (v1.0):**
```
Chrome Extension → Bridge Server (Node.js) → Home Assistant
```

**Neue Architektur (v2.0):**
```
Chrome Extension ↔ Home Assistant (direkt via WebSocket API)
```

## Migration

Falls du die alte Version mit Bridge Server benutzt hast:

1. **Stoppe den Bridge Server** (falls er läuft)
   ```bash
   # PM2 Nutzer:
   pm2 stop google-meets-bridge
   pm2 delete google-meets-bridge

   # Manuell:
   # Einfach den Server beenden (Ctrl+C)
   ```

2. **Aktualisiere die Chrome Extension**
   - Lade die Extension neu in Chrome
   - Öffne Extension-Optionen
   - Konfiguriere Home Assistant URL und Access Token
   - Siehe `INSTALL.md` für Details

3. **Aktualisiere die Home Assistant Integration**
   - Ersetze die alte Integration mit der neuen Version
   - Entferne `bridge_url` aus `configuration.yaml`
   - Starte Home Assistant neu

4. **Fertig!** Der Bridge Server wird nicht mehr benötigt.

## Warum wurde das geändert?

**Vorteile der neuen Architektur:**
- ✅ Einfachere Installation (keine Node.js, keine npm, keine Dependencies)
- ✅ Weniger Fehlerquellen (eine Komponente weniger)
- ✅ Nutzt offizielle Home Assistant WebSocket API
- ✅ Event-basierte Kommunikation statt HTTP Polling
- ✅ Bessere Performance
- ✅ Einfacheres Debugging

**Was wurde entfernt:**
- ❌ Bridge Server (Node.js + Express + WebSocket Server)
- ❌ HTTP API auf Port 8555
- ❌ Zusätzliche Dependencies (npm packages)
- ❌ Notwendigkeit PM2 oder ähnliches zu nutzen

## Kann ich den alten Bridge Server noch nutzen?

Technisch ja, aber **nicht empfohlen**. Die alte Version ist:
- Nicht mehr maintained
- Komplexer als nötig
- Hat eine zusätzliche Fehlerquelle

Die neue direkte Verbindung ist in jeder Hinsicht besser.

## Kann ich diesen Ordner löschen?

Ja! Dieser Ordner (`bridge-server/`) wird nur aus Kompatibilitätsgründen im Repository behalten. Du kannst ihn getrost ignorieren oder löschen.

## Support

Falls du Probleme bei der Migration hast, siehe:
- `INSTALL.md` für die neue Installationsanleitung
- `README.md` für die neue Architektur-Dokumentation
- GitHub Issues für Support
