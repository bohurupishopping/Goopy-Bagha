document.addEventListener('DOMContentLoaded', () => {
  const modeSelect = document.getElementById('enhancement-mode');
  
  // Load saved settings
  chrome.storage.sync.get(['enhancementMode'], (result) => {
    if (result.enhancementMode) {
      modeSelect.value = result.enhancementMode;
    }
  });

  // Save settings when changed
  modeSelect.addEventListener('change', (e) => {
    chrome.storage.sync.set({
      enhancementMode: e.target.value
    });
  });
}); 