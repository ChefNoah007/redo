document.addEventListener('DOMContentLoaded', function () {
  // Prüfen, ob eine userID bereits im localStorage vorhanden ist
  let userID = localStorage.getItem('VF_UserID');
  if (!userID) {
      userID = `${Math.floor(Math.random() * 1000000000000000)}`;
      localStorage.setItem('VF_UserID', userID);
  }
  console.log('User ID:', userID);

  // Voiceflow-Einstellungen direkt im Code definiert
  // Diese Werte wurden aus app/utils/voiceflow-settings.server.js übernommen
  let VF_KEY = "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi";
  let VF_PROJECT_ID = "6703af9afcd0ea507e9c5369";
  let VF_VERSION_ID = "6703af9afcd0ea507e9c536a";
  const currentUrl = window.location.href;

  // Dummy-Funktion, die immer erfolgreich ist
  async function loadVoiceflowSettings() {
    console.log('Voiceflow-Einstellungen direkt geladen:', {
      vf_key: VF_KEY,
      vf_project_id: VF_PROJECT_ID,
      vf_version_id: VF_VERSION_ID
    });
    return true;
  }


  function delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const vfInteract = async (user, userAction) => {
      clearInputState();
      showTypingIndicator();

      const interractionUrl = `https://general-runtime.voiceflow.com/state/user/${user}/interact`;

      const payload = {
          action: userAction,
      };

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

      // check if we get the response, if there's an error, we can catch it here
      if (!data.ok) {
          throw new Error(`Interact HTTP error! status: ${data.status}`);
      }

      if (data.ok && userAction.type !== 'launch') {
          vfSaveTranscript();
      }

      const postRes = await data.json();
      
      hideTypingIndicator();
      return postRes;
  };

  const vfSendLaunch = async (payload = null) => {
      let interractPayload = {
          type: 'launch',
      };
      if (payload) {
          interractPayload = {
              type: 'launch',
              payload: payload,
          };  
      }
      vfInteract(userID, interractPayload).then((res) => {
          //console.log(res);
          handleAgentResponse(res);
      });
  };

  const vfSendMessage = async (message) => {
      vfInteract(userID, { type: 'text', payload: message }).then((res) => {
          console.log(res);
          handleAgentResponse(res);
      });
  }

  const vfSendAction = async (action) => {
      console.log('Sending action:', action);
      vfInteract(userID, action).then((res) => {
          console.log(res);
          handleAgentResponse(res);
      });
  }

  const vfSaveTranscript = async () => {
      const transcriptsUrl = 'https://api.voiceflow.com/v2/transcripts';
      const transcriptsOptions = {
          method: 'PUT',
          headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              Authorization: VF_KEY
          },
          body: JSON.stringify({projectID: VF_PROJECT_ID, versionID: VF_VERSION_ID, sessionID: `${userID}`}),
      };
      console.log('Saving transcript:', transcriptsOptions);
      const data = await fetch(transcriptsUrl, transcriptsOptions);
      console.log('Transcripts response:', data);
      if (!data.ok) {
          throw new Error(`Transcripts HTTP error! status: ${data.status}`);
      }
      const postRes = await data.json();
      return postRes;
  }

  const chatContainer = document.getElementById('chat-container-mobile');
  const productName = chatContainer.dataset.productName;
  const pageSlug = chatContainer.dataset.pageSlug;

  const chatBox = document.getElementById('chat-box-mobile');
  const typingIndicator = document.getElementById('chat-box-typing-indicator-container-mobile');
  const chatInput = document.getElementById('chat-input-mobile');
  const sendButton = document.getElementById('chat-send-button-mobile');
  const buttonDiv = document.getElementById('chat-button-box-mobile');
  const addToCartButton = document.getElementById('chat-add-to-cart-mobile');
  const shareButton = document.getElementById('chat-copy-button-mobile');

  function addUserMessage(message) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'vf-message vf-message-user';
      messageDiv.textContent = message;
      chatBox.appendChild(messageDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
  }

  function addAgentMessage(message) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'vf-message vf-message-agent';
      message = message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      message = message.replace(/\*(.*?)\*/g, '<i>$1</i>');
      message = message.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
      message = message.replace(/(\n)+/g, '<br>');
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

  function showTypingIndicator() {
      typingIndicator.style.display = 'block';
  }
  
  function hideTypingIndicator() {
      typingIndicator.style.display = 'none';
  }

  async function handleAgentResponse(response) {
      for (const trace of response) {
          if (trace.type === 'text') {
              addAgentMessage(trace.payload.message);
              await delay(1000);
          } else if (trace.type === 'choice') {
              addAgentNormalButton(trace.payload.buttons);
          } else if (trace.type === 'add_to_cart' || (trace.type === "trace" && trace.payload.name === "add_to_cart")) {
              showAddToCart();
          } else if (trace.type === 'share' || (trace.type === "trace" && trace.payload.name === "share")) {
              showShareButton();
          } else if (trace.type === 'visual' && trace.payload.image) {  // 🆕 Neuer Code für Bilder
              addAgentImage(trace.payload.image);
          } else {
              //console.log('Unbekannter Trace-Typ:', trace.type, trace);
          }
          //console.log(trace);
      }
  }
  

  function sendMessage() {
      const message = chatInput.value;
      if (message.trim() === '') return;
      chatInput.value = '';
      addUserMessage(message);
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

  // Voiceflow-Einstellungen laden und dann Chat initialisieren
  loadVoiceflowSettings().then(success => {
    if (success) {
      vfSendLaunch({ productName: productName, pageSlug: pageSlug, currentUrl: currentUrl });
    } else {
      // Fallback-Nachricht anzeigen, wenn die Einstellungen nicht geladen werden konnten
      const messageDiv = document.createElement('div');
      messageDiv.className = 'vf-message vf-message-agent';
      messageDiv.innerHTML = 'Der Chat konnte nicht initialisiert werden. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.';
      chatBox.appendChild(messageDiv);
    }
  });

});
