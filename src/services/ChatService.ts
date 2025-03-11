import { Preferences } from '@capacitor/preferences';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export const API_KEY_STORAGE = 'deepseek_api_key';

export class ChatService {
  static async getApiKey(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: API_KEY_STORAGE });
      return value || null;
    } catch (error) {
      console.error('Failed to load API key:', error);
      return null;
    }
  }

  static async saveApiKey(apiKey: string): Promise<void> {
    try {
      await Preferences.set({
        key: API_KEY_STORAGE,
        value: apiKey,
      });
      // Dispatch event for components to update
      document.dispatchEvent(new CustomEvent('apiKeyChanged', { detail: apiKey }));
    } catch (error) {
      console.error('Failed to save API key:', error);
      throw error;
    }
  }

  static async sendChatRequest(
    apiKey: string, 
    messages: Message[], 
    abortSignal: AbortSignal,
    onChunk: (content: string, tokenUsage?: any) => void,
    onError: (errorType: string, errorMessage: string) => void
  ): Promise<void> {
    try {
      if (!apiKey) {
        onError('invalid_api_key', 'API key is missing');
        return;
      }

      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: formattedMessages,
          stream: true
        }),
        signal: abortSignal
      });

      if (response.status === 401 || response.status === 403) {
        onError('auth_error', 'Authentication error');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.error && 
            errorData.error.type === 'invalid_request_error' && 
            errorData.error.message && 
            errorData.error.message.includes('API key')) {
          onError('invalid_api_key', 'Invalid API key');
        } else {
          onError('api_error', errorData.error?.message || 'Unknown error');
        }
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedContent = '';
      let receivedFirstChunk = false;
      let tokenUsage = {
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined
      };

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line === 'data: [DONE]' || !line.trim()) continue;
            
            const jsonData = line.replace(/^data: /, '').trim();
            
            try {
              const data = JSON.parse(jsonData);
              
              if (data.usage) {
                // Update token usage with the latest data
                tokenUsage = {
                  promptTokens: data.usage.prompt_tokens,
                  completionTokens: data.usage.completion_tokens,
                  totalTokens: data.usage.total_tokens
                };
                // Remove this console log
              }
              
              if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                const contentDelta = data.choices[0].delta.content;
                
                if (!receivedFirstChunk) {
                  accumulatedContent = contentDelta;
                  receivedFirstChunk = true;
                } else {
                  accumulatedContent += contentDelta;
                }
                
                // Always pass the current token usage with each content update
                onChunk(accumulatedContent, tokenUsage);
              }
            } catch (e) {
              console.error('Error parsing streaming response:', e, jsonData);
            }
          }
        }
        
        // Make sure to send the final token usage when the stream is complete
        if (receivedFirstChunk) {
          onChunk(accumulatedContent, tokenUsage);
        }
      }
    } catch (error) {
      console.error('Error in sendChatRequest:', error);
      
      if ((error as Error).name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('API error:', error);
        onError('network_error', (error as Error).message);
      }
    }
  }
}