import { Mistral } from './lib/mistral.js';

// Initialize Mistral client
const mistralClient = new Mistral({
  apiKey: 'xqFeJfYTbu8IgeK68NucEl0xnWtZTxiT'
});

// Create context menu items
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      enhancementMode: 'improve'
    });
  }

  // Create context menu items
  chrome.contextMenus.create({
    id: 'grammar-fix',
    title: 'Correct Grammar',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'improve-text',
    title: 'Improve Text',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.selectionText) {
    const mode = info.menuItemId === 'grammar-fix' ? 'grammar' : 'improve';
    chrome.tabs.sendMessage(tab.id, {
      type: 'CONTEXT_ENHANCE',
      text: info.selectionText,
      mode: mode
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ENHANCE_TEXT') {
    handleTextEnhancement(request.text, request.mode, request.isRealTime)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Will respond asynchronously
  }
});

async function handleTextEnhancement(text, mode, isRealTime = false) {
  // Choose model based on whether it's real-time or not
  const model = isRealTime 
    ? "ministral-3b-2410"  // Faster model for real-time
    : "open-mistral-nemo"; // Better model for full enhancement

  const prompts = {
    improve: `Enhance this text, make it more comprehensive and well-explained while maintaining the original intent, Return only the enhanced version:
${text}`,

    grammar: isRealTime 
      ? `Complete or fix this text, quick grammar and spelling check, suggest completions where relevant, Return only the corrected text without any formatting or explanations:
${text}`
      : `Fix grammar and spelling. Return only the corrected text:
${text}`,

    professional: `Make this text more professional and formal. Keep the same content but use professional language. Return only the converted text:
${text}`,

    casual: `Make this casual. Return only the converted text:
${text}`
  };

  const systemPrompts = {
    improve: "You are a text enhancer. Return only the enhanced text without any explanations or formatting.",
    
    grammar: isRealTime 
      ? "You are a text completer and corrector. Return only the text without any asterisks, quotes, or explanations."
      : "You are a grammar and spelling checker. Return only the corrected text without any formatting or explanations.",
    
    professional: "You are a professional tone converter. Return only the converted text without any formatting.",
    
    casual: "You are a casual tone converter. Return only the converted text without any formatting."
  };

  try {
    const response = await mistralClient.chat({
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompts[mode]
        },
        {
          role: 'user',
          content: prompts[mode]
        }
      ],
      temperature: isRealTime ? 0.3 : (mode === 'grammar' ? 0.1 : 0.7),
      max_tokens: isRealTime ? 100 : 2000,
      top_p: isRealTime ? 0.5 : 0.9
    });

    let enhancedText = response.choices[0].message.content;
    
    // Clean up the response
    enhancedText = enhancedText
      // Remove any markdown formatting
      .replace(/[*_`]/g, '')
      // Remove quotes
      .replace(/^["']|["']$/g, '')
      // Remove "Added X for completion" patterns
      .replace(/\(Added .* for completion\)/g, '')
      // Remove any other explanatory text
      .replace(/^(Here'?s?|This is|The) (the )?(corrected|improved|enhanced|professional|casual) (version|text):?\s*/i, '')
      // Clean up extra whitespace
      .trim()
      // Normalize line breaks
      .replace(/\n{3,}/g, '\n\n');

    return { success: true, text: enhancedText };
  } catch (error) {
    console.error('Mistral API Error:', error);
    throw new Error(error.message || 'Failed to enhance text');
  }
} 