// This file is loaded by the voiceflow_settings.liquid block
// It makes the Voiceflow settings available to the chat components

(function() {
  console.log('voiceflow-settings.js: Script started');
  
  // Default settings to use if any values are missing
  const DEFAULT_SETTINGS = {
    vf_key: "VF.DM.670508f0cd8f2c59f1b534d4.t6mfdXeIfuUSTqUi",
    vf_project_id: "6703af9afcd0ea507e9c5369",
    vf_version_id: "6703af9afcd0ea507e9c536a"
  };

  // Check if the settings were injected by the block
  if (window.VOICEFLOW_SETTINGS) {
    console.log('voiceflow-settings.js: Voiceflow settings found in window.VOICEFLOW_SETTINGS');
    
    // Ensure all required properties exist, use defaults for any missing ones
    if (!window.VOICEFLOW_SETTINGS.vf_key) {
      console.warn('voiceflow-settings.js: vf_key missing in VOICEFLOW_SETTINGS, using default');
      window.VOICEFLOW_SETTINGS.vf_key = DEFAULT_SETTINGS.vf_key;
    }
    
    if (!window.VOICEFLOW_SETTINGS.vf_project_id) {
      console.warn('voiceflow-settings.js: vf_project_id missing in VOICEFLOW_SETTINGS, using default');
      window.VOICEFLOW_SETTINGS.vf_project_id = DEFAULT_SETTINGS.vf_project_id;
    }
    
    if (!window.VOICEFLOW_SETTINGS.vf_version_id) {
      console.warn('voiceflow-settings.js: vf_version_id missing in VOICEFLOW_SETTINGS, using default');
      window.VOICEFLOW_SETTINGS.vf_version_id = DEFAULT_SETTINGS.vf_version_id;
    }
    
    console.log('voiceflow-settings.js: Final Voiceflow settings:', {
      vf_key: window.VOICEFLOW_SETTINGS.vf_key ? "Present (masked)" : "Missing",
      vf_project_id: window.VOICEFLOW_SETTINGS.vf_project_id,
      vf_version_id: window.VOICEFLOW_SETTINGS.vf_version_id
    });
  } else {
    console.warn('voiceflow-settings.js: Voiceflow settings not found in window.VOICEFLOW_SETTINGS, creating with defaults');
    
    // Create settings object with defaults if it doesn't exist at all
    window.VOICEFLOW_SETTINGS = DEFAULT_SETTINGS;
    
    console.log('voiceflow-settings.js: Using fallback Voiceflow settings');
  }
  
  // Set a flag to indicate that the settings are ready
  window.voiceflowSettingsReady = true;
  
  // Dispatch an event to notify other scripts that Voiceflow settings are ready
  document.dispatchEvent(new CustomEvent('voiceflow-settings-ready'));
})();
