(function() { 
    // Funktion zum Setup des Custom Renderers
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
  
  // CSS-Code per JavaScript in den Head einfügen
  var css = `
  /* Link-Styles */
  .link-highlight {
    color: #0066cc;         /* Kräftiges Blau */
    font-weight: bold;       /* Fettschrift */
    text-decoration: underline;  /* Unterstrichen */
  }
  .link-highlight:hover {
    color: #004499;         /* Dunkleres Blau beim Überfahren */
    text-decoration: none;
  }
  
  /* Typing Indicator Animation */
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
  
  // Restlicher Code:
  document.addEventListener('DOMContentLoaded', function () {
    // Prüfen, ob eine userID bereits im localStorage vorhanden ist
    let userID = localStorage.getItem('VF_UserID');
    if (!userID) {
      userID = `${Math.floor(Math.random() * 1000000000000000)}`;
      localStorage.setItem('VF_UserID', userID);
    }
    console.log('User ID:', userID);
  
    const VF_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
    const VF_PROJECT_ID = "6703af9afcd0ea507e9c5369";
    const VF_VERSION_ID = "6703af9afcd0ea507e9c536a";
    const currentUrl = window.location.href;
    const pageTitle = document.title;
    console.log('Aktuelle URL:', currentUrl);
    console.log('Seitentitel:', pageTitle);
  
    function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  
    // Funktion, um einen Cookie zu setzen, wenn der Kunde mit dem Chat interagiert
    function setChatInteractedCookie() {
      if (!document.cookie.includes("chatInteracted=true")) {
        var d = new Date();
        d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000)); // Gültigkeit: 365 Tage
        var expires = "expires=" + d.toUTCString();
        document.cookie = "chatInteracted=true; " + expires + "; path=/";
        console.log("Cookie 'chatInteracted' wurde gesetzt.");
      }
    }
  
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
  
      // Falls es sich nicht um einen launch-Request handelt, speichern wir das Transcript
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
  
    // UI-Handling und Event Listener
    const chatContainer = document.getElementById('chat-container');
    console.log("Chat-Container Dataset:", chatContainer.dataset);
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
        // Erstelle einen neuen Renderer und definiere die link()-Methode
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
        message = message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        message = message.replace(/\*(.*?)\*/g, '<i>$1</i>');
        message = message.replace(/\[(.*?)\]\((.*?)\)/g, '<a class="link-highlight" href="$2" target="_blank">$1</a>');
        message = message.replace(/(\n)+/g, '<br>');
      }
      const messageDiv = document.createElement('div');
      messageDiv.className = 'vf-message vf-message-agent';
      messageDiv.innerHTML = message;
      chatBox.appendChild(messageDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
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
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  
    function addAgentNormalButton(buttons) {
      for (const button of buttons) {
        const buttonElement = document.createElement('button');
        buttonElement.className = 'vf-message-button';
        buttonElement.textContent = button.name;
        buttonElement.addEventListener('click', function () {
          addUserMessage(button.name);
          console.log('Button clicked:', button);
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
      chatBox.scrollTop = chatBox.scrollHeight;
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
  
    // Angepasster Typing Indicator mit Animation:
    let typingIndicatorTimeout; // Globaler Timer
    function showTypingIndicator() {
      // Zuerst wird der Text ohne Animation angezeigt
      typingIndicator.style.display = 'block';
      typingIndicator.innerHTML = `KI denkt <span class="typing-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>`;
      // Nach 2 Sekunden wechseln wir zu "Beanie schreibt" mit animierten Punkten
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
  
    function sendMessage() {
      // Setze den Cookie, sobald der Kunde interagiert
      setChatInteractedCookie();
      const message = chatInput.value;
      if (message.trim() === '') return;
      chatInput.value = '';
      addUserMessage(message);
      console.log("sendMessage - User Message:", message);
      vfSendMessage(message);
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
  
    // Launch-Payload erstellen: Hier werden currentURL, pageTitle und andere Parameter übergeben
    const launchPayload = { 
      productName: productName, 
      pageSlug: pageSlug, 
      currentURL: currentUrl,
      pageTitle: pageTitle
    };
    console.log("vfSendLaunch - Launch-Payload:", launchPayload);
    vfSendLaunch(launchPayload);
  });
  