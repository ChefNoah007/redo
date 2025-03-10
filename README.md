# AI-Agent Shopify App

Eine KI-Chat-App für Shopify-Stores, die mit Voiceflow integriert ist.

## Vorbereitung für einen neuen Store

Wenn Sie die App für einen neuen Store vorbereiten möchten, folgen Sie diesen Schritten:

### 1. Shopify App-Konfiguration aktualisieren

Bearbeiten Sie die `shopify.app.toml` Datei:

```toml
# shopify.app.toml
name = "AI-Agent"
client_id = "Ihr Client ID"
application_url = "https://ihre-app-url.com"
# ...
```

- Aktualisieren Sie `dev_store_url` auf die URL des neuen Stores
- Aktualisieren Sie `application_url`, falls Sie eine neue URL für die App verwenden
- Aktualisieren Sie `redirect_urls` entsprechend, falls sich die Application URL ändert

### 2. Umgebungsvariablen einrichten

Sie können die `.env` Datei automatisch generieren lassen, wobei Werte aus der `shopify.app.toml` Datei extrahiert werden:

```bash
npm run generate-env
```

Dieser Befehl:
- Extrahiert `SHOPIFY_API_KEY` und `SHOP_DOMAIN` aus der `shopify.app.toml` Datei
- Fragt Sie nach dem `SHOPIFY_API_SECRET` (finden Sie im Shopify Partner Dashboard)
- Fragt optional nach Judge.me und Voiceflow Credentials

Alternativ können Sie die `.env` Datei manuell erstellen, basierend auf der `.env.example` Vorlage:

```bash
cp .env.example .env
```

Die Datei sollte die folgenden Umgebungsvariablen enthalten:

```
# Shopify API credentials
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOP_DOMAIN=your-store.myshopify.com
SHOPIFY_APP_URL=your_app_url

# Judge.me API token
JUDGE_ME_API_TOKEN=your_judge_me_api_token

# Voiceflow API credentials
VF_KEY=your_voiceflow_api_key
VF_PROJECT_ID=your_voiceflow_project_id
VF_VERSION_ID=your_voiceflow_version_id
```

### 3. Metafields einrichten

Die App verwendet Metafields, um Einstellungen zu speichern. Diese werden automatisch erstellt, wenn die App zum ersten Mal gestartet wird, aber Sie können sie auch manuell einrichten:

#### Judge.me Metafield einrichten

```bash
npm run setup-judge-me
```

#### Voiceflow Metafield einrichten

```bash
npm run setup-voiceflow
```

#### API URL für Client-seitige Skripte einrichten

```bash
npm run setup-api-url
```

Dieser Befehl erstellt eine JavaScript-Datei, die die API-URL für client-seitige Skripte bereitstellt. Dies ist wichtig für die korrekte Funktion des Trackings und anderer client-seitiger Funktionen.

### 4. App deployen und installieren

```bash
npm run deploy
```
```

Installieren Sie die App im neuen Store und konfigurieren Sie die Einstellungen:

1. Öffnen Sie die App im Shopify Admin
2. Konfigurieren Sie die Chat-Einstellungen (Farben, Texte, etc.)
3. Geben Sie den Judge.me API-Token ein, falls Sie Judge.me verwenden
4. Speichern Sie die Einstellungen

### 5. Testen

Nach der Installation sollten Sie die App gründlich testen:

- Überprüfen Sie, ob der Chat korrekt angezeigt wird
- Testen Sie die Interaktion mit dem Chat-Assistenten
- Überprüfen Sie, ob die Metafields korrekt erstellt wurden
- Testen Sie die Integration mit dem Warenkorb

## Dynamische Referenzen

Die App wurde so aktualisiert, dass sie dynamische Referenzen verwendet, anstatt hardcodierte Werte zu verwenden:

1. **Shop-Domain**: Die App verwendet jetzt die aktuelle Shop-Domain aus der Session, anstatt eine hardcodierte Domain zu verwenden.
2. **Judge.me API-Token**: Der Judge.me API-Token wird jetzt aus einem Metafield geladen und kann über die Einstellungsseite konfiguriert werden.
3. **Voiceflow-Einstellungen**: Die Voiceflow-Einstellungen werden jetzt aus einem Metafield geladen und können über die Einstellungsseite konfiguriert werden.
4. **API-URL**: Die API-URL wird jetzt aus der Umgebungsvariable SHOPIFY_APP_URL geladen, anstatt hardcodiert zu sein.

Diese Änderungen machen die App flexibler und einfacher zu warten, da sie für verschiedene Stores ohne manuelle Codeänderungen verwendet werden kann.

## Entwicklung

### Lokale Entwicklung

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Deployment

```bash
npm run deploy
# ai-agent
