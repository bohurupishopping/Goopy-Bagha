import { Mistral } from './lib/mistral.js';

// Initialize Mistral client
const mistralClient = new Mistral({
  apiKey: 'xqFeJfYTbu8IgeK68NucEl0xnWtZTxiT'
});

// Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      enhancementMode: 'improve'
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
    improve: `Enhance this text by adding relevant context, details, and better structure. Make it more comprehensive and well-explained while maintaining the original intent and better structure:

${text}`,

    grammar: isRealTime 
      ? `Quick grammar and spelling check, suggest completions where relevant, return only the corrected version without any additional text or explanations:

${text}`
      : `Fix only grammar and spelling errors. Do not change the content or style, return only the corrected version without any additional text or explanations:

${text}`,

    professional: `Make this text more professional and formal. Keep the same content but use professional language, return only the professional version without any additional text or explanations:

${text}`,

    casual: `Make this text more casual and friendly. Keep the same content but use conversational language, return only the casual version without any additional text or explanations:

${text}`
  };

  const systemPrompts = {
    improve: "You are an expert writing assistant. Add relevant context, details, and explanations to make the text more comprehensive while maintaining its original intent. Return only the improved version without any additional text or explanations.",
    
    grammar: isRealTime 
      ? "You are a quick grammar checker. Focus on immediate fixes and suggest completions. Be concise and fast. Return only the corrected version without any additional text or explanations."
      : "You are a spelling correction assistant. Fix only spelling errors. Do not modify the content or style. Return only the corrected version without any additional text or explanations",
    
    professional: "You are a professional writing assistant. Convert the text to a professional tone while keeping the same content. Return only the professional version without any additional text or explanations",
    
    casual: "You are a casual writing assistant. Convert the text to a friendly, conversational tone while keeping the same content. Return only the casual version without any additional text or explanations"
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
      .replace(/^(Here'?s? (?:is )?(?:the )?(?:corrected|improved|enhanced|professional|casual) (?:version|text):?\s*)/i, '')
      .replace(/^\s*["']|["']\s*$/g, '')
      .trim();

    return { success: true, text: enhancedText };
  } catch (error) {
    console.error('Mistral API Error:', error);
    throw new Error(error.message || 'Failed to enhance text');
  }
} 