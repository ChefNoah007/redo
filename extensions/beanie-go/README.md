# Voiceflow Settings Integration

Diese Erweiterung ermöglicht die Integration von Voiceflow-Einstellungen aus den Shop-Metadaten in die Chat-Komponenten.

## Anleitung zur Installation

### 1. Voiceflow Settings Block hinzufügen

Der `Voiceflow Settings` Block muss zum Theme hinzugefügt werden. Dies stellt sicher, dass die Voiceflow-Einstellungen vor dem Laden der Chat-Komponenten verfügbar sind.

1. Öffnen Sie den Theme Editor
2. Wählen Sie den Bereich, in dem Sie den Block hinzufügen möchten (z.B. Header oder Footer)
3. Klicken Sie auf "Block hinzufügen"
4. Wählen Sie "Voiceflow Settings" aus der Liste der verfügbaren Blöcke

Der Block ist unsichtbar und hat keine visuellen Elemente, aber er lädt die Voiceflow-Einstellungen aus den Shop-Metadaten.

### 2. Funktionsweise

Der Block lädt die Voiceflow-Einstellungen aus den Shop-Metadaten und stellt sie als globale Variable `window.VOICEFLOW_SETTINGS` zur Verfügung. Die Chat-Komponenten (Desktop und Mobile) verwenden diese Einstellungen automatisch.

Falls die Metadaten nicht verfügbar sind, werden Fallback-Einstellungen verwendet.

## Fehlerbehebung

Wenn die Chat-Komponenten die Voiceflow-Einstellungen nicht korrekt laden:

1. Prüfen Sie, ob der Voiceflow Settings Block korrekt zum Theme hinzugefügt wurde
2. Prüfen Sie in der Browser-Konsole, ob `window.VOICEFLOW_SETTINGS` korrekt gesetzt ist
3. Stellen Sie sicher, dass die Metadaten im Shop korrekt konfiguriert sind

## Komponenten

- `voiceflow_settings.liquid`: Block zum Laden der Einstellungen
- `chat-box.js`: Desktop-Chat-Komponente
- `chat-box-mobile.js`: Mobile-Chat-Komponente
- `voiceflow_Bubble.liquid`: Voiceflow Bubble-Komponente
- `voiceflow_chat.liquid`: Desktop Voiceflow Chat-Komponente

## Github Push
1. git remote rm origin
git remote add origin https://github.com/ChefNoah007/ai-agent.git

2.  git add .         
git commit -m "<Kommentar>"
git push origin main