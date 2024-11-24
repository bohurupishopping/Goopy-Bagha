class TextEnhancer {
  constructor() {
    this.activeButtons = new Map(); // Track buttons for each text area
    this.initializeTextAreas();
    this.enhancementMode = 'improve';
    this.loadSettings();
    this.selectedText = '';
    this.autoSuggestionsEnabled = false;
    
    // Add mutation observer for dynamic content
    this.observeDOM();
    
    // Special handling for Gmail
    if (window.location.hostname === 'mail.google.com') {
      this.initializeGmailSupport();
    }
  }

  initializeGmailSupport() {
    // Check for Gmail compose box every second until found
    const checkGmailCompose = setInterval(() => {
      const gmailComposeBoxes = document.querySelectorAll('div[role="textbox"][aria-label*="Message"]');
      if (gmailComposeBoxes.length > 0) {
        gmailComposeBoxes.forEach(textBox => {
          if (!textBox.dataset.aiEnhanced) {
            this.addEnhancementButton(textBox);
            this.addSelectionHandling(textBox);
            textBox.dataset.aiEnhanced = 'true';
          }
        });
      }
    }, 1000);

    // Clear interval after 1 minute to prevent unnecessary checking
    setTimeout(() => clearInterval(checkGmailCompose), 60000);
  }

  initializeTextAreas() {
    // Find all text areas and editable divs
    const textElements = document.querySelectorAll(`
      textarea, 
      [contenteditable="true"],
      div[role="textbox"],
      .editable,
      [data-lexical-editor="true"]
    `);
    
    textElements.forEach(textArea => {
      if (!textArea.dataset.aiEnhanced) {
        this.addEnhancementButton(textArea);
        this.addSelectionHandling(textArea);
        textArea.dataset.aiEnhanced = 'true';
      }
    });
  }

  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // ELEMENT_NODE
              // Check for new text areas
              const textElements = node.querySelectorAll(`
                textarea, 
                [contenteditable="true"],
                div[role="textbox"],
                .editable,
                [data-lexical-editor="true"]
              `);
              
              textElements.forEach(textArea => {
                if (!textArea.dataset.aiEnhanced) {
                  this.addEnhancementButton(textArea);
                  this.addSelectionHandling(textArea);
                  textArea.dataset.aiEnhanced = 'true';
                }
              });
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['contenteditable', 'role']
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['enhancementMode']).catch(() => ({}));
      if (result?.enhancementMode) {
        this.enhancementMode = result.enhancementMode;
      }
    } catch (error) {
      console.log('Settings load failed, using defaults');
    }
  }

  addSelectionHandling(textArea) {
    const updateSelectionState = () => {
      let selection;
      if (textArea.value !== undefined) {
        selection = textArea.value.substring(textArea.selectionStart, textArea.selectionEnd);
      } else {
        selection = window.getSelection().toString();
      }
      
      const button = document.querySelector('.ai-enhance-btn');
      if (button) {
        if (selection) {
          button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L20 7L12 12L4 7L12 2Z"/>
              <path d="M20 7V17L12 22L4 17V7" stroke-opacity="0.5"/>
            </svg>
            <span>Selection</span>
          `;
          this.selectedText = selection;
        } else {
          // Just show the current mode name
          const modeName = {
            'improve': 'Improve',
            'grammar': 'Grammar',
            'professional': 'Professional',
            'casual': 'Casual'
          }[this.enhancementMode] || 'Improve';
          
          button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L20 7L12 12L4 7L12 2Z"/>
              <path d="M20 7V17L12 22L4 17V7" stroke-opacity="0.5"/>
            </svg>
            <span>${modeName}</span>
          `;
        }
      }
    };

    textArea.addEventListener('mouseup', updateSelectionState);
    textArea.addEventListener('keyup', (e) => {
      if (e.key === 'Shift' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        updateSelectionState();
      }
    });
  }

  addEnhancementButton(textArea) {
    // Check if button already exists for this text area
    if (this.activeButtons.has(textArea)) {
      return;
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'ai-enhance-container ai-enhance-hidden';

    // Create the main button with dropdown
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'ai-button-group';

    const mainButton = document.createElement('button');
    mainButton.className = 'ai-enhance-btn';
    mainButton.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L20 7L12 12L4 7L12 2Z"/>
        <path d="M20 7V17L12 22L4 17V7" stroke-opacity="0.5"/>
      </svg>
      <span>${this.enhancementMode === 'improve' ? 'Improve' : 
             this.enhancementMode === 'grammar' ? 'Grammar' : 
             this.enhancementMode === 'professional' ? 'Professional' : 
             this.enhancementMode === 'casual' ? 'Casual' : 'Improve'}</span>
    `;

    const dropdownButton = document.createElement('button');
    dropdownButton.className = 'ai-enhance-dropdown-btn';
    dropdownButton.innerHTML = `
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9L12 15L18 9"/>
      </svg>
    `;

    const dropdown = document.createElement('div');
    dropdown.className = 'ai-enhance-dropdown';
    
    const options = [
      { 
        value: 'improve', 
        label: 'Improve Writing',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L20 7L12 12L4 7L12 2Z"/>
              </svg>`,
        description: 'Enhance clarity and flow'
      },
      { 
        value: 'grammar', 
        label: 'Fix Grammar',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 21h16M4 10h16M4 3h16"/>
              </svg>`,
        description: 'Correct grammar and spelling'
      },
      { 
        value: 'professional', 
        label: 'Make Professional',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21"/>
              </svg>`,
        description: 'Formal and business-like'
      },
      { 
        value: 'casual', 
        label: 'Make Casual',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              </svg>`,
        description: 'Friendly and conversational'
      }
    ];

    // Add divider and toggle after the options
    const divider = document.createElement('div');
    divider.className = 'ai-enhance-divider';
    dropdown.appendChild(divider);

    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'ai-enhance-toggle-container';

    const toggleLabel = document.createElement('div');
    toggleLabel.className = 'ai-enhance-toggle-label';

    const toggleIcon = document.createElement('div');
    toggleIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    `;

    const toggleTextContainer = document.createElement('div');
    toggleTextContainer.innerHTML = `
      Auto Suggestions
      <div class="ai-enhance-toggle-description">Get real-time writing suggestions</div>
    `;

    const toggle = document.createElement('div');
    toggle.className = 'ai-enhance-toggle';

    // Load saved state
    chrome.storage.sync.get(['autoSuggestions'], (result) => {
      if (result.autoSuggestions) {
        toggle.classList.add('active');
      }
    });

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      const isActive = toggle.classList.contains('active');
      
      // Save state
      chrome.storage.sync.set({ autoSuggestions: isActive });
      
      // Update the class property
      this.autoSuggestionsEnabled = isActive;
      
      // Enable or disable real-time checking
      if (isActive) {
        this.initializeRealTimeChecking(textArea);
      }
    });

    toggleLabel.appendChild(toggleIcon);
    toggleLabel.appendChild(toggleTextContainer);
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggle);
    dropdown.appendChild(toggleContainer);

    options.forEach(option => {
      const item = document.createElement('div');
      item.className = 'ai-enhance-dropdown-item';
      
      const icon = document.createElement('div');
      icon.innerHTML = option.icon;
      icon.style.display = 'flex';
      icon.style.alignItems = 'center';
      icon.style.justifyContent = 'center';
      icon.style.width = '20px';
      icon.style.height = '20px';
      
      const textContainer = document.createElement('div');
      textContainer.style.display = 'flex';
      textContainer.style.flexDirection = 'column';
      
      const label = document.createElement('div');
      label.textContent = option.label;
      label.style.fontWeight = '500';
      
      const description = document.createElement('div');
      description.textContent = option.description;
      description.style.fontSize = '11px';
      description.style.color = '#666';
      description.style.marginTop = '2px';
      
      textContainer.appendChild(label);
      textContainer.appendChild(description);
      
      item.appendChild(icon);
      item.appendChild(textContainer);
      
      item.dataset.value = option.value;
      item.addEventListener('click', () => {
        this.enhancementMode = option.value;
        try {
          chrome.storage.sync.set({ enhancementMode: option.value }).catch(() => {});
        } catch (error) {
          console.log('Failed to save settings');
        }
        dropdown.classList.remove('show');
        
        // Update main button text to show only the selected mode
        const mainButton = buttonContainer.querySelector('.ai-enhance-btn');
        if (mainButton) {
          mainButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L20 7L12 12L4 7L12 2Z"/>
              <path d="M20 7V17L12 22L4 17V7" stroke-opacity="0.5"/>
            </svg>
            <span>${option.label.replace(' Writing', '').replace('Make ', '').replace('Fix ', '')}</span>
          `;
        }
      });
      
      dropdown.appendChild(item);
    });

    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'ai-loading-spinner';
    loadingSpinner.style.display = 'none';

    // Add sparkle element to the spinner
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    loadingSpinner.appendChild(sparkle);

    dropdownButton.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });

    buttonGroup.appendChild(mainButton);
    buttonGroup.appendChild(dropdownButton);
    buttonContainer.appendChild(buttonGroup);
    buttonContainer.appendChild(dropdown);
    buttonContainer.appendChild(loadingSpinner);

    mainButton.addEventListener('click', async () => {
      await this.enhanceText(textArea, mainButton, loadingSpinner);
    });

    this.positionButtonContainer(textArea, buttonContainer);
    document.body.appendChild(buttonContainer);

    // Track this button
    this.activeButtons.set(textArea, buttonContainer);

    // Show button only when text area is focused
    textArea.addEventListener('focus', () => {
      buttonContainer.classList.remove('ai-enhance-hidden');
      buttonContainer.classList.add('ai-enhance-visible');
    });

    textArea.addEventListener('blur', (e) => {
      // Don't hide if clicking the enhance button or dropdown
      if (buttonContainer.contains(e.relatedTarget)) {
        return;
      }
      buttonContainer.classList.remove('ai-enhance-visible');
      buttonContainer.classList.add('ai-enhance-hidden');
    });

    // Remove button when text area is removed
    const observer = new MutationObserver((mutations, obs) => {
      if (!document.body.contains(textArea)) {
        buttonContainer.remove();
        this.activeButtons.delete(textArea);
        obs.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // After creating buttonContainer, add drag functionality
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX;
    let initialY;

    const dragStart = (e) => {
        // Don't drag if clicking buttons or dropdown
        if (e.target.closest('.ai-enhance-btn, .ai-enhance-dropdown-btn, .ai-enhance-dropdown')) {
            return;
        }
        
        const rect = buttonContainer.getBoundingClientRect();
        
        // Calculate initial position based on current screen position
        initialX = e.clientX - rect.left;
        initialY = e.clientY - rect.top;
        
        buttonContainer.classList.add('dragging');
        isDragging = true;
    };

    const drag = (e) => {
        if (!isDragging) return;
        
        e.preventDefault();
        
        // Calculate new position
        const newX = e.clientX - initialX;
        const newY = e.clientY - initialY;
        
        // Constrain to window bounds
        const bounds = buttonContainer.getBoundingClientRect();
        const maxX = window.innerWidth - bounds.width;
        const maxY = window.innerHeight - bounds.height;
        
        currentX = Math.min(Math.max(0, newX), maxX);
        currentY = Math.min(Math.max(0, newY), maxY);
        
        buttonContainer.style.left = `${currentX}px`;
        buttonContainer.style.top = `${currentY}px`;
        buttonContainer.style.bottom = 'auto'; // Remove bottom positioning
    };

    const dragEnd = () => {
        if (!isDragging) return;
        
        buttonContainer.classList.remove('dragging');
        isDragging = false;
        
        // Save position to storage
        try {
            chrome.storage.local.set({
                buttonPosition: { x: currentX, y: currentY }
            });
        } catch (error) {
            console.log('Failed to save button position');
        }
    };

    // Load saved position
    try {
        chrome.storage.local.get(['buttonPosition'], (result) => {
            if (result.buttonPosition) {
                currentX = result.buttonPosition.x;
                currentY = result.buttonPosition.y;
                buttonContainer.style.left = `${currentX}px`;
                buttonContainer.style.top = `${currentY}px`;
                buttonContainer.style.bottom = 'auto';
            }
        });
    } catch (error) {
        console.log('Failed to load button position');
    }

    // Add event listeners
    buttonContainer.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Update enhanceText method to add generating animation
    const originalEnhanceText = this.enhanceText;
    this.enhanceText = async (textArea, button, loadingSpinner) => {
      button.classList.add('generating');
      try {
        await originalEnhanceText.call(this, textArea, button, loadingSpinner);
      } finally {
        button.classList.remove('generating');
      }
    };

    // Add real-time checking
    this.initializeRealTimeChecking(textArea);
  }

  positionButtonContainer(textArea, container) {
    // Set initial position (bottom left)
    container.style.position = 'fixed';  // Changed from 'absolute'
    container.style.bottom = '80px';     // Initial bottom position
    container.style.left = '24px';       // Initial left position
    
    // Remove scroll and resize listeners since position is now fixed
    // Remove ResizeObserver since we're not tracking text area position anymore
  }

  async enhanceText(textArea, button, loadingSpinner) {
    try {
      // Check if text is empty or only whitespace
      const textToEnhance = this.selectedText || textArea.value || textArea.textContent;
      if (!textToEnhance?.trim()) {
        this.showToast('Please enter some text to enhance', 'error');
        return;
      }

      // Check if text is too short
      if (textToEnhance.trim().length < 3) {
        this.showToast('Text is too short to enhance', 'error');
        return;
      }

      button.classList.add('generating');
      button.nextElementSibling?.classList.add('generating');
      loadingSpinner.classList.add('active');
      loadingSpinner.style.display = 'block';
      
      // Add particles effect
      const particles = document.createElement('div');
      particles.className = 'ai-enhance-particles';
      button.appendChild(particles);
      
      for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particles.appendChild(particle);
      }

      let response;
      try {
        response = await chrome.runtime.sendMessage({
          type: 'ENHANCE_TEXT',
          text: textToEnhance,
          mode: this.enhancementMode
        });
      } catch (chromeError) {
        response = await this.directApiCall(textToEnhance, this.enhancementMode);
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Create accept/reject buttons
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'ai-enhance-actions';
      
      const acceptButton = document.createElement('button');
      acceptButton.className = 'ai-enhance-accept';
      acceptButton.textContent = 'Accept';
      
      const rejectButton = document.createElement('button');
      rejectButton.className = 'ai-enhance-reject';
      rejectButton.textContent = 'Reject';

      actionsContainer.appendChild(acceptButton);
      actionsContainer.appendChild(rejectButton);
      button.parentElement.appendChild(actionsContainer);

      // Show the enhanced text preview with typing effect
      const originalText = textArea.value || textArea.textContent;
      await this.applyTypingEffect(textArea, response.text);

      // Show accept/reject buttons
      actionsContainer.classList.add('show');

      // Handle accept/reject
      return new Promise((resolve) => {
        acceptButton.onclick = async () => {
          actionsContainer.remove();
          this.showToast('Changes applied successfully!', 'success');
          resolve();
        };

        rejectButton.onclick = async () => {
          // Restore original text
          if (textArea.value !== undefined) {
            textArea.value = originalText;
          } else {
            textArea.textContent = originalText;
          }
          actionsContainer.remove();
          this.showToast('Changes rejected', 'error');
          resolve();
        };
      });

    } catch (error) {
      console.error('Error enhancing text:', error);
      this.showToast(error.message || 'Failed to enhance text. Please try again.', 'error');
    } finally {
      button.classList.remove('generating');
      button.nextElementSibling?.classList.remove('generating');
      loadingSpinner.classList.remove('active');
      loadingSpinner.style.display = 'none';
      
      const particles = button.querySelector('.ai-enhance-particles');
      if (particles) {
        particles.addEventListener('animationend', () => {
          particles.remove();
        });
      }
    }
  }

  async directApiCall(text, mode) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ENHANCE_TEXT',
        text: text,
        mode: mode
      });
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Failed to enhance text');
      }
      
      return response;
    } catch (error) {
      console.error('Direct API call failed:', error);
      throw error;
    }
  }

  showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `ai-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  async applyTypingEffect(element, newText) {
    const originalContent = element.value || element.textContent;
    const chunks = newText.split('');
    let currentText = '';
    
    // Add typing animation class
    element.classList.add('typing-animation');
    
    // Fast typing effect
    for (let i = 0; i < chunks.length; i++) {
      currentText += chunks[i];
      if (element.value !== undefined) {
        element.value = currentText;
      } else {
        element.textContent = currentText;
      }
      // Very small delay for fast typing effect
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    // Remove typing animation class
    element.classList.remove('typing-animation');
  }

  async initializeRealTimeChecking(textArea) {
    let typingTimer;
    const doneTypingInterval = 1000;
    let lastText = '';
    let suggestions = new Map();
    let currentSentence = '';

    const handleTabKey = (e) => {
      if (!this.autoSuggestionsEnabled) return;
      if (e.key === 'Tab' && suggestions.size > 0) {
        e.preventDefault();
        const visibleSuggestion = Array.from(suggestions.values()).find(
          el => el.classList.contains('show')
        );
        
        if (visibleSuggestion) {
          const originalText = visibleSuggestion.dataset.originalText;
          const correctedText = visibleSuggestion.querySelector('.ai-suggestion-text').textContent;
          
          this.applySuggestion(textArea, originalText, correctedText);
          visibleSuggestion.remove();
          suggestions.delete(originalText);
          this.showToast('Suggestion applied', 'success');
        }
      }
    };

    // Function to get current sentence being typed
    const getCurrentSentence = (text, cursorPosition) => {
      if (!text) return '';
      
      // Get text up to cursor
      const textUpToCursor = text.substring(0, cursorPosition);
      
      // Find the last sentence boundary before cursor
      const lastSentenceStart = Math.max(
        textUpToCursor.lastIndexOf('.'),
        textUpToCursor.lastIndexOf('!'),
        textUpToCursor.lastIndexOf('?')
      );
      
      return textUpToCursor.substring(lastSentenceStart + 1).trim();
    };

    // Real-time checking function
    const checkText = async () => {
      if (!this.autoSuggestionsEnabled) return;
      
      const text = textArea.value || textArea.textContent;
      const cursorPosition = textArea.selectionStart || text.length;
      
      // Get current sentence
      currentSentence = getCurrentSentence(text, cursorPosition);
      
      if (currentSentence.length < 3) return;
      if (currentSentence === lastText) return;
      
      lastText = currentSentence;

      try {
        // Clear existing suggestions
        suggestions.forEach(suggestion => suggestion.remove());
        suggestions.clear();

        const response = await chrome.runtime.sendMessage({
          type: 'ENHANCE_TEXT',
          text: currentSentence,
          mode: 'grammar',
          isRealTime: true
        });

        if (response.success && response.text !== currentSentence) {
          const suggestion = document.createElement('div');
          suggestion.className = 'ai-suggestion-container';
          suggestion.dataset.originalText = currentSentence;
          
          const suggestionText = document.createElement('div');
          suggestionText.className = 'ai-suggestion-text';
          suggestionText.textContent = response.text.trim();
          suggestion.appendChild(suggestionText);

          this.makeSuggestionDraggable(suggestion, textArea);
          suggestions.set(currentSentence, suggestion);
          document.body.appendChild(suggestion);
          
          // Show suggestion with animation
          requestAnimationFrame(() => suggestion.classList.add('show'));
        }
      } catch (error) {
        console.error('Real-time check failed:', error);
      }
    };

    // Add input event listener for real-time checking
    const inputHandler = () => {
      if (!this.autoSuggestionsEnabled) return;
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => checkText(), doneTypingInterval);
    };

    // Add keyup listener for immediate checking on sentence completion
    const keyupHandler = (e) => {
      if (!this.autoSuggestionsEnabled) return;
      if (e.key === '.' || e.key === '!' || e.key === '?') {
        clearTimeout(typingTimer);
        checkText();
      }
    };

    // Add event listeners
    textArea.addEventListener('input', inputHandler);
    textArea.addEventListener('keyup', keyupHandler);
    textArea.addEventListener('keydown', handleTabKey);

    // Store event listeners for cleanup
    textArea._realTimeHandlers = {
      input: inputHandler,
      keyup: keyupHandler,
      keydown: handleTabKey
    };

    // Load initial state
    chrome.storage.sync.get(['autoSuggestions'], (result) => {
      this.autoSuggestionsEnabled = result.autoSuggestions || false;
      if (this.autoSuggestionsEnabled && textArea.value || textArea.textContent) {
        checkText();
      }
    });
  }

  highlightDifferences(textArea, originalText, correctedText, suggestions) {
    // Clear existing suggestions first
    suggestions.forEach(suggestion => suggestion.remove());
    suggestions.clear();

    const sentences = originalText.match(/[^.!?]+[.!?]+/g) || [originalText];
    const correctedSentences = correctedText.match(/[^.!?]+[.!?]+/g) || [correctedText];

    sentences.forEach((sentence, index) => {
      if (index >= correctedSentences.length) return;
      
      const correctedSentence = correctedSentences[index];
      if (sentence.trim() !== correctedSentence.trim()) {
        const suggestion = document.createElement('div');
        suggestion.className = 'ai-suggestion-container';
        suggestion.innerHTML = `
          <div>Suggestion:</div>
          <div class="ai-suggestion-text">${correctedSentence.trim()}</div>
        `;

        const range = this.findTextRange(textArea, sentence);
        if (range) {
          const rect = range.getBoundingClientRect();
          suggestion.style.top = `${rect.top - 40}px`;
          suggestion.style.left = `${rect.left}px`;

          suggestion.addEventListener('click', () => {
            this.applySuggestion(textArea, sentence, correctedSentence);
            suggestion.remove();
            suggestions.delete(sentence);
          });

          suggestions.set(sentence, suggestion);
          document.body.appendChild(suggestion);
          requestAnimationFrame(() => suggestion.classList.add('show'));
        }
      }
    });
  }

  findTextRange(textArea, text) {
    if (textArea.value !== undefined) {
      const start = textArea.value.indexOf(text);
      if (start >= 0) {
        textArea.setSelectionRange(start, start + text.length);
        return textArea.getBoundingClientRect();
      }
    } else {
      const range = document.createRange();
      const textNodes = [];
      const walker = document.createTreeWalker(
        textArea,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      for (const node of textNodes) {
        const index = node.textContent.indexOf(text);
        if (index >= 0) {
          range.setStart(node, index);
          range.setEnd(node, index + text.length);
          return range;
        }
      }
    }
    return null;
  }

  applySuggestion(textArea, originalText, correctedText) {
    try {
      if (textArea.value !== undefined) {
        // For regular input/textarea elements
        const start = textArea.value.indexOf(originalText);
        if (start >= 0) {
          const newValue = textArea.value.substring(0, start) +
                          correctedText +
                          textArea.value.substring(start + originalText.length);
          
          // Use native setter when possible
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            "value"
          ).set;
          
          nativeInputValueSetter.call(textArea, newValue);
          
          // Trigger events
          textArea.dispatchEvent(new Event('input', { bubbles: true }));
          textArea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        // For contenteditable elements
        const content = textArea.textContent;
        const start = content.indexOf(originalText);
        if (start >= 0) {
          const newContent = content.substring(0, start) +
                            correctedText +
                            content.substring(start + originalText.length);
          
          textArea.textContent = newContent;
          
          // Trigger events
          textArea.dispatchEvent(new Event('input', { bubbles: true }));
          textArea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      
      this.showToast('Suggestion applied', 'success');
    } catch (error) {
      console.error('Error applying suggestion:', error);
      this.showToast('Failed to apply suggestion', 'error');
    }
  }

  // Update the makeSuggestionDraggable method
  makeSuggestionDraggable(suggestion, textArea) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    // Get initial position relative to text area
    const textAreaRect = textArea.getBoundingClientRect();
    suggestion.style.position = 'fixed';
    suggestion.style.left = `${textAreaRect.left}px`;
    suggestion.style.top = `${textAreaRect.top - suggestion.offsetHeight - 10}px`;

    const dragStart = (e) => {
      if (e.target.classList.contains('ai-suggestion-text')) {
        // If clicking the suggestion text, apply it
        const originalText = suggestion.dataset.originalText;
        const correctedText = e.target.textContent;
        if (originalText && correctedText) {
          this.applySuggestion(textArea, originalText, correctedText);
          suggestion.remove();
        }
        return;
      }

      const rect = suggestion.getBoundingClientRect();
      initialX = e.clientX - rect.left;
      initialY = e.clientY - rect.top;
      
      suggestion.classList.add('dragging');
      isDragging = true;
    };

    const drag = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      // Constrain to window bounds
      const bounds = suggestion.getBoundingClientRect();
      const maxX = window.innerWidth - bounds.width;
      const maxY = window.innerHeight - bounds.height;
      
      currentX = Math.min(Math.max(0, currentX), maxX);
      currentY = Math.min(Math.max(0, currentY), maxY);
      
      suggestion.style.left = `${currentX}px`;
      suggestion.style.top = `${currentY}px`;
    };

    const dragEnd = () => {
      if (!isDragging) return;
      suggestion.classList.remove('dragging');
      isDragging = false;
    };

    suggestion.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Add close button
    const closeButton = document.createElement('div');
    closeButton.className = 'ai-suggestion-close';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => suggestion.remove());
    suggestion.appendChild(closeButton);

    // Add apply button
    const applyButton = document.createElement('button');
    applyButton.className = 'ai-suggestion-apply';
    applyButton.textContent = 'Apply';
    applyButton.addEventListener('click', () => {
      const originalText = suggestion.dataset.originalText;
      const correctedText = suggestion.querySelector('.ai-suggestion-text').textContent;
      if (originalText && correctedText) {
        this.applySuggestion(textArea, originalText, correctedText);
        suggestion.remove();
      }
    });
    suggestion.appendChild(applyButton);
  }
}

// Initialize the enhancer when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new TextEnhancer();
});

// Also initialize immediately in case DOMContentLoaded has already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  new TextEnhancer();
} 