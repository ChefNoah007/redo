(function() { 
  // 1) marked.js-Setup (unverändert):
  function setupMarked() {
    marked.use({
      renderer: {
        link: function() {
          let href, title, text;
          if (arguments.length === 1 && typeof arguments[0] === 'object') {
            const token = arguments[0];
            href = token.href;
            title = token.title;
            text = token.text;
          } else {
            [href, title, text] = arguments;
          }
          console.log("Renderer.link aufgerufen mit:", href, title, text);
          return `<a class="link-highlight" href="${href}" title="${title || ''}" target="_blank">${text}</a>`;
        }
      }
    });
    console.log("marked.js Konfiguration angewendet.");
  }

  if (typeof marked === 'undefined') {
    var script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
    script.onload = function() {
      setupMarked();
      console.log("marked.js erfolgreich geladen.");
    };
    document.head.appendChild(script);
  } else {
    setupMarked();
  }
})();

// 2) CSS-Codes (unverändert):
var css = `
.link-highlight {
  color: #0066cc;
  font-weight: bold;
  text-decoration: underline;
}
.link-highlight:hover {
  color: #004499;
  text-decoration: none;
}

@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}
.typing-dots span {
  display: inline-block;
  animation: blink 1.4s infinite both;
}
.typing-dots span:nth-child(1) {
  animation-delay: 0s;
}
.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}
`;
var style = document.createElement('style');
style.type = 'text/css';
if (style.styleSheet) {
style.styleSheet.cssText = css;
} else {
style.appendChild(document.createTextNode(css));
}
document.head.appendChild(style);

// 3) Haupt-Code:
document.addEventListener('DOMContentLoaded', function () {
  // Flag, um festzulegen, ob bereits interagiert wurde
  let autoScrollEnabled = false;
  let userHasInteracted = false;
  
  // Entferne den setTimeout, der vorher autoScrollEnabled aktivierte

  // (A) UserID in localStorage
  let userID = localStorage.getItem('VF_UserID');
  if (!userID) {
    userID = `${Math.floor(Math.random() * 1000000000000000)}`;
    localStorage.setItem('VF_UserID', userID);
  }
  console.log('User ID:', userID);

  // Voiceflow-Einstellungen werden vom Server geladen
  let VF_KEY = "";
  let VF_PROJECT_ID = "";
  let VF_VERSION_ID = "";
  const currentUrl = window.location.href;
  const pageTitle = document.title;
  console.log('Aktuelle URL:', currentUrl);
  console.log('Seitentitel:', pageTitle);

  // Funktion zum Laden der Voiceflow-Einstellungen
  async function loadVoiceflowSettings() {
    return new Promise((resolve) => {
      try {
        console.log('Prüfe Voiceflow-Einstellungen...');
        
        // Prüfen, ob die Einstellungen vom Snippet gesetzt wurden
        if (window.VOICEFLOW_SETTINGS) {
          console.log('Verwende Voiceflow-Einstellungen aus dem Snippet...');
          
          // Einstellungen global setzen
          VF_KEY = window.VOICEFLOW_SETTINGS.vf_key;
          VF_PROJECT_ID = window.VOICEFLOW_SETTINGS.vf_project_id;
          VF_VERSION_ID = window.VOICEFLOW_SETTINGS.vf_version_id;
          
          console.log('Voiceflow-Einstellungen erfolgreich geladen:', {
            vf_key: VF_KEY ? "Present (masked)" : "Missing",
            vf_project_id: VF_PROJECT_ID || "Missing",
            vf_version_id: VF_VERSION_ID || "Missing"
          });
          
          resolve(true);
        } else {
          console.warn('Keine Voiceflow-Einstellungen gefunden, verwende Fallback-Einstellungen...');
          
          // Fallback zu statischen Einstellungen
          const settings = {
            vf_key: "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi",
            vf_project_id: "6703af9afcd0ea507e9c5369",
            vf_version_id: "6703af9afcd0ea507e9c536a"
          };
          
          // Einstellungen global setzen
          VF_KEY = settings.vf_key;
          VF_PROJECT_ID = settings.vf_project_id;
          VF_VERSION_ID = settings.vf_version_id;
          
          console.log('Fallback-Voiceflow-Einstellungen geladen:', {
            vf_key: VF_KEY ? "Present (masked)" : "Missing",
            vf_project_id: VF_PROJECT_ID || "Missing",
            vf_version_id: VF_VERSION_ID || "Missing"
          });
          
          resolve(true);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Voiceflow-Einstellungen:', error);
        
        // Fallback zu statischen Einstellungen im Fehlerfall
        const settings = {
          vf_key: "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi",
          vf_project_id: "6703af9afcd0ea507e9c5369",
          vf_version_id: "6703af9afcd0ea507e9c536a"
        };
        
        // Einstellungen global setzen
        VF_KEY = settings.vf_key;
        VF_PROJECT_ID = settings.vf_project_id;
        VF_VERSION_ID = settings.vf_version_id;
        
        console.log('Fehlerfall: Fallback-Voiceflow-Einstellungen geladen');
        resolve(true);
      }
    });
  }

  // NEU: Seiteninhalt extrahieren
  // Passe den Selektor (#main-content) bei Bedarf an die Struktur deiner Seite an
  const contentElement = document.querySelector("#main");
  let pageContent = "";
  if (contentElement) {
    pageContent = contentElement.innerText || contentElement.textContent;
    // Optional: Text kürzen, falls er zu lang ist
    if (pageContent.length > 1000) {
      pageContent = pageContent.substring(0, 1000) + "...";
    }
    console.log("Extrahierter Seiteninhalt:", pageContent);
  } else {
    console.log("Kein Element mit ID 'main-content' gefunden.");
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * NEU: Statt Cookie -> Warenkorb-Attribut 'usedChat' setzen
   */
  function setUsedChatAttribute() {
    console.log("Versuche, usedChat und VF_UserID im Warenkorb zu setzen...");
    // 1) Aktuellen Cart laden (optional, aber üblich)
    fetch("/cart.js")
      .then((res) => res.json())
      .then((cart) => {
        console.log("Aktueller Cart:", cart);
        // 2) POST auf /cart/update.js, um die Attribute zu setzen
        return fetch("/cart/update.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attributes: {
              usedChat: "true",
              VF_UserID: userID // Voiceflow UserID hinzufügen
            },
          }),
        });
      })
      .then((res) => res.json())
      .then((updatedCart) => {
        console.log("Warenkorb-Attribute gesetzt:", updatedCart.attributes);
      })
      .catch((err) => {
        console.error("Fehler beim Setzen der Attribute:", err);
      });
  }

  // 4) Voiceflow-Interaktion (unverändert)
  const vfInteract = async (user, userAction) => {
    clearInputState();
    showTypingIndicator();
    const interractionUrl = `https://general-runtime.voiceflow.com/state/user/${user}/interact`;
    const payload = { action: userAction };
    console.log("vfInteract - Sende Payload:", payload);

    const data = await fetch(interractionUrl, {
      headers: {
        'Authorization': VF_KEY,
        'accept': 'application/json',
        'content-type': 'application/json',
        'versionID': 'production',
      },
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!data.ok) {
      throw new Error(`Interact HTTP error! status: ${data.status}`);
    }

    if (data.ok && userAction.type !== 'launch') {
      vfSaveTranscript();
    }

    const postRes = await data.json();
    console.log("vfInteract - Antwort erhalten:", postRes);
    hideTypingIndicator();
    return postRes;
  };

  const vfSendLaunch = async (payload = null) => {
    let interractPayload = { type: 'launch' };
    if (payload) {
      interractPayload = { type: 'launch', payload: payload };
    }
    console.log("vfSendLaunch - Sende Launch-Payload:", interractPayload);
    vfInteract(userID, interractPayload).then((res) => {
      console.log("vfSendLaunch - Antwort:", res);
      handleAgentResponse(res);
    });
  };

  const vfSendMessage = async (message) => {
    console.log("vfSendMessage - Sende Nachricht:", message);
    vfInteract(userID, { type: 'text', payload: message }).then((res) => {
      console.log("vfSendMessage - Antwort:", res);
      handleAgentResponse(res);
    });
  };

  const vfSendAction = async (action) => {
    console.log('vfSendAction - Sende Action:', action);
    vfInteract(userID, action).then((res) => {
      console.log("vfSendAction - Antwort:", res);
      handleAgentResponse(res);
    });
  };

  const vfSaveTranscript = async () => {
    const transcriptsUrl = 'https://api.voiceflow.com/v2/transcripts';
    const transcriptsOptions = {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        Authorization: VF_KEY
      },
      body: JSON.stringify({
        projectID: VF_PROJECT_ID,
        versionID: VF_VERSION_ID,
        sessionID: `${userID}`
      }),
    };
    console.log('vfSaveTranscript - Sende Transcript-Optionen:', transcriptsOptions);
    const data = await fetch(transcriptsUrl, transcriptsOptions);
    console.log('vfSaveTranscript - Antwort:', data);
    if (!data.ok) {
      throw new Error(`Transcripts HTTP error! status: ${data.status}`);
    }
    const postRes = await data.json();
    return postRes;
  };

  // 5) UI-Handling
  const chatContainer = document.getElementById('chat-container');
  const productName = chatContainer.dataset.productName;
  const pageSlug = chatContainer.dataset.pageSlug;
  console.log("Produktname aus Dataset:", productName, "Page Slug aus Dataset:", pageSlug);

  const chatBox = document.getElementById('chat-box');
  const typingIndicator = document.getElementById('chat-box-typing-indicator-container');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('chat-send-button');
  const buttonDiv = document.getElementById('chat-button-box');
  const addToCartButton = document.getElementById('chat-add-to-cart');
  const shareButton = document.getElementById('chat-copy-button');

  function addUserMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'vf-message vf-message-user';
    messageDiv.textContent = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function addAgentMessage(message) {
    if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
      const renderer = new marked.Renderer();
      renderer.link = function() {
        let href, title, text;
        if (arguments.length === 1 && typeof arguments[0] === 'object') {
          const token = arguments[0];
          href = token.href;
          title = token.title;
          text = token.text;
        } else {
          [href, title, text] = arguments;
        }
        console.log("Renderer.link aufgerufen mit:", href, title, text);
        return `<a class="link-highlight" href="${href}" title="${title || ''}" target="_blank">${text}</a>`;
      };
      message = marked.parse(message, { renderer: renderer });
    } else {
      // Fallback
      message = message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      message = message.replace(/\*(.*?)\*/g, '<i>$1</i>');
      message = message.replace(/\[(.*?)\]\((.*?)\)/g, '<a class="link-highlight" href="$2" target="_blank">$1</a>');
      message = message.replace(/(\n)+/g, '<br>');
    }
    const messageDiv = document.createElement('div');
    messageDiv.className = 'vf-message vf-message-agent';
    messageDiv.innerHTML = message;
    chatBox.appendChild(messageDiv);
    
    // Vorhandenes Scroll-Verhalten (scrollt bis zum Ende des Chat-Inhalts)
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // ZUSÄTZLICH: Scroll, sodass der obere Rand der Agentennachricht oben in der Chat-Box liegt.
    // Wenn der "chat-all-button-container" vorhanden ist, warten wir eine feste Zeit (z. B. 500ms),
    // bevor zum Agenten-Element gescrollt wird.
    if (autoScrollEnabled) {
      setTimeout(() => {
        if (document.getElementById("chat-all-button-container")) {
          // Warten, bis der Button-Container sichtbar ist, dann scrollen
          setTimeout(() => {
            chatBox.scrollTop = messageDiv.offsetTop;
          }, 500); // Verzögerung anpassen, je nach Bedarf
        } else {
          chatBox.scrollTop = messageDiv.offsetTop;
        }
      }, 0);
    }
    
    // Weiterer Code (z. B. Header-Scroll)
    if (autoScrollEnabled) {
      // Führe den window.scrollTo-Block nur aus, wenn der Button-Container NICHT vorhanden oder nicht sichtbar ist.
      const btnContainer = document.getElementById("chat-all-button-container");
      if (!btnContainer || window.getComputedStyle(btnContainer).display === "none") {
        const shopHeader = document.querySelector('#shopify-section-header, #header, .site-header, header');
        let headerHeight = shopHeader ? shopHeader.offsetHeight : 100;
        const chatContainer = document.getElementById('chat-container');
        const rect = chatContainer.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetY = rect.top + scrollTop - headerHeight - 50;
        window.scrollTo({
          top: targetY,
          behavior: 'smooth'
        });
      }
    }
  }

  function addAgentImage(imageUrl) {
    const imageDiv = document.createElement('div');
    imageDiv.className = 'vf-message vf-message-agent';
    const imgElement = document.createElement('img');
    imgElement.src = imageUrl;
    imgElement.alt = "Bild von Voiceflow";
    imgElement.style.maxWidth = "100%";
    imgElement.style.borderRadius = "0px";
    imgElement.style.margin = "10px 0";
    imageDiv.appendChild(imgElement);
    chatBox.appendChild(imageDiv);
    
    // Vorhandenes Scroll-Verhalten
    chatBox.scrollTop = chatBox.scrollHeight;

    // ZUSÄTZLICH: Scroll, sodass der obere Rand des Bildes oben in der Chat-Box liegt
    if (autoScrollEnabled) {
      setTimeout(() => {
        chatBox.scrollTop = imageDiv.offsetTop;
      }, 0);
    }
    
    if (autoScrollEnabled) {
      const shopHeader = document.querySelector('#shopify-section-header, #header, .site-header, header');
      let headerHeight = shopHeader ? shopHeader.offsetHeight : 100;
      const chatContainer = document.getElementById('chat-container');
      const rect = chatContainer.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - headerHeight - 50;
      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    }
  }

  // WICHTIG: Hier wird jetzt setUsedChatAttribute() auch beim Button-Klick auf "choice"-Buttons aufgerufen
  function addAgentNormalButton(buttons) {
    for (const button of buttons) {
      const buttonElement = document.createElement('button');
      buttonElement.className = 'vf-message-button';
      buttonElement.textContent = button.name;
      buttonElement.addEventListener('click', function () {
        // Chat wird genutzt
        setUsedChatAttribute();
        addUserMessage(button.name);
        console.log('Button clicked:', button);
        
        if (button.name.trim().toLowerCase() === 'nein, danke') {
          // Bei Klick auf "Nein, danke" scrollen wir nicht automatisch, 
          // auch wenn dies die erste Interaktion wäre.
          autoScrollEnabled = false;
          console.log('Auto-scrolling disabled due to "Nein, danke" selection');
        } else {
          // Falls noch nicht interagiert, aktiviere Auto-Scroll
          if (!userHasInteracted) {
            userHasInteracted = true;
            autoScrollEnabled = true;
            console.log("Auto-scrolling enabled on first user interaction");
          }
        }
        
        if (button.request.payload.actions) {
          for (const action of button.request.payload.actions) {
            if (action.type === 'open_url') {
              console.log('Opening URL:', action.payload.url);
              window.open(action.payload.url, '_blank');
            } else {
              console.log('Unknown button action type:', action.type);
            }
          }
        }
        console.log('Sending action:', button.request);
        vfSendAction(button.request);
      });
      buttonDiv.appendChild(buttonElement);
    }
    
    // Standard-Scroll-Verhalten beibehalten
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Scroll-Befehl nur ausführen, wenn autoScrollEnabled aktiv ist
    if (autoScrollEnabled && buttonDiv.id !== 'chat-all-button-container') {
      const shopHeader = document.querySelector('#shopify-section-header, #header, .site-header, header');
      let headerHeight = shopHeader ? shopHeader.offsetHeight : 100;
      const chatContainer = document.getElementById('chat-container');
      const rect = chatContainer.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = rect.top + scrollTop - headerHeight - 80;
      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    }
  }

  function showAddToCart() {
    addToCartButton.style.display = 'block';
  }
  function hideAddToCart() {
    addToCartButton.style.display = 'none';
  }
  function showShareButton() {
    shareButton.style.display = 'block';
  }
  function hideShareButton() {
    shareButton.style.display = 'none';
  }

  let typingIndicatorTimeout;
  function showTypingIndicator() {
    typingIndicator.style.display = 'block';
    typingIndicator.innerHTML = `KI denkt <span class="typing-dots">
      <span>.</span><span>.</span><span>.</span>
    </span>`;
    typingIndicatorTimeout = setTimeout(() => {
      if (typingIndicator.style.display === 'block') {
        typingIndicator.innerHTML = `KI schreibt <span class="typing-dots">
          <span>.</span><span>.</span><span>.</span>
        </span>`;
      }
    }, 3000);
  }

  function hideTypingIndicator() {
    clearTimeout(typingIndicatorTimeout);
    typingIndicator.style.display = 'none';
    typingIndicator.innerText = "";
  }

  async function handleAgentResponse(response) {
    console.log("handleAgentResponse - Response:", response);
    for (const trace of response) {
      console.log("Received trace:", trace);
      if (trace.type === 'text') {
        addAgentMessage(trace.payload.message);
        await delay(1000);
      } else if (trace.type === 'choice') {
        addAgentNormalButton(trace.payload.buttons);
      } else if (trace.type === 'add_to_cart' || (trace.type === "trace" && trace.payload.name === "add_to_cart")) {
        showAddToCart();
      } else if (trace.type === 'share' || (trace.type === "trace" && trace.payload.name === "share")) {
        showShareButton();
      } else if (trace.type === 'visual' && trace.payload.image) {
        addAgentImage(trace.payload.image);
      }
    }
  }

  // => HIER statt Cookie nun 'usedChat' in Cart setzen
  function sendMessage() {
    setUsedChatAttribute(); // <--- NEU
    const message = chatInput.value;
    if (message.trim() === '') return;
    chatInput.value = '';
    addUserMessage(message);
    console.log("sendMessage - User Message:", message);
    vfSendMessage(message);
    
    // Beim Senden einer Nachricht gilt: erste Interaktion -> enable scroll
    if (!userHasInteracted) {
      userHasInteracted = true;
      autoScrollEnabled = true;
      console.log("Auto-scrolling enabled on first user interaction");
    }
  }

  function copyToClipboard() {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(function() {
      addAgentMessage('Product URL copied to clipboard');
    }, function(err) {
      addAgentMessage(`Here's the product URL: ${currentUrl}`);
    });
  }

  function clearInputState() {
    buttonDiv.innerHTML = '';
    hideAddToCart();
    hideShareButton();
  }

  sendButton.addEventListener('click', sendMessage);
  shareButton.addEventListener('click', copyToClipboard);
  chatInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  // (6) Voiceflow-Einstellungen laden und dann Chat initialisieren
  loadVoiceflowSettings().then(success => {
    if (success) {
      // Hier wird nun zusätzlich der extrahierte Seiteninhalt mitübergeben
      const launchPayload = { 
        productName: productName, 
        pageSlug: pageSlug, 
        currentURL: currentUrl,
        pageTitle: pageTitle,
        pageContent: pageContent
      };
      console.log("vfSendLaunch - Launch-Payload:", launchPayload);
      vfSendLaunch(launchPayload);
    } else {
      // Fallback-Nachricht anzeigen, wenn die Einstellungen nicht geladen werden konnten
      const messageDiv = document.createElement('div');
      messageDiv.className = 'vf-message vf-message-agent';
      messageDiv.innerHTML = 'Der Chat konnte nicht initialisiert werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.';
      chatBox.appendChild(messageDiv);
    }
  });
});
