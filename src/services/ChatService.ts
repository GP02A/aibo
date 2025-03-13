import { Preferences } from '@capacitor/preferences';
import OpenAI from 'openai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

interface ApiProvider {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

const API_PROVIDERS_STORAGE = 'api_providers';
const ACTIVE_PROVIDER_STORAGE = 'active_provider';
// Keep the old key for backward compatibility
const LEGACY_API_KEY_STORAGE = 'deepseek_api_key';

// Default providers configuration
const DEFAULT_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-3.5-turbo'
  },
  {
    id: 'custom',
    name: 'Custom',
    baseURL: '',
    model: ''
  }
];

export class ChatService {
  // Get all available API providers
  static async getApiProviders(): Promise<ApiProvider[]> {
    try {
      const { value } = await Preferences.get({ key: API_PROVIDERS_STORAGE });
      if (value) {
        return JSON.parse(value);
      }
      
      // If no providers are stored, return default providers with empty API keys
      return DEFAULT_PROVIDERS.map(provider => ({
        ...provider,
        apiKey: ''
      }));
    } catch (error) {
      console.error('Failed to load API providers:', error);
      // Return default providers on error
      return DEFAULT_PROVIDERS.map(provider => ({
        ...provider,
        apiKey: ''
      }));
    }
  }

  // Save all API providers
  static async saveApiProviders(providers: ApiProvider[]): Promise<void> {
    try {
      // Save the providers to storage
      await Preferences.set({
        key: API_PROVIDERS_STORAGE,
        value: JSON.stringify(providers),
      });
      
      // Add a longer delay to ensure the data is properly saved
      // before any other operations that might depend on this data
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Verify the data was saved correctly
      const { value } = await Preferences.get({ key: API_PROVIDERS_STORAGE });
      if (!value) {
        console.warn('Failed to verify API providers were saved - no value returned');
        // Try saving again
        await Preferences.set({
          key: API_PROVIDERS_STORAGE,
          value: JSON.stringify(providers),
        });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Failed to save API providers:', error);
      throw error;
    }
  }

  // Get the active provider ID
  static async getActiveProviderId(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: ACTIVE_PROVIDER_STORAGE });
      return value || 'deepseek'; // Default to deepseek if not set
    } catch (error) {
      console.error('Failed to load active provider:', error);
      return 'deepseek';
    }
  }

  // Set the active provider ID
  static async setActiveProviderId(providerId: string): Promise<void> {
    try {
      await Preferences.set({
        key: ACTIVE_PROVIDER_STORAGE,
        value: providerId,
      });
      // Dispatch event for components to update
      // Use setTimeout to ensure the event is dispatched after the current execution context
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('activeProviderChanged', { detail: providerId }));
      }, 0);
    } catch (error) {
      console.error('Failed to save active provider:', error);
      throw error;
    }
  }

  // Get the active provider
  static async getActiveProvider(): Promise<ApiProvider | null> {
    try {
      const providerId = await this.getActiveProviderId();
      const providers = await this.getApiProviders();
      
      // Find the active provider
      const activeProvider = providers.find(p => p.id === providerId);
      
      // If no active provider found, try to migrate from legacy API key
      if (!activeProvider || !activeProvider.apiKey) {
        return await this.migrateLegacyApiKey(providers);
      }
      
      return activeProvider;
    } catch (error) {
      console.error('Failed to get active provider:', error);
      return null;
    }
  }

  // For backward compatibility: migrate from the old API key storage
  static async migrateLegacyApiKey(providers: ApiProvider[]): Promise<ApiProvider | null> {
    try {
      const { value } = await Preferences.get({ key: LEGACY_API_KEY_STORAGE });
      if (value) {
        // Update the DeepSeek provider with the legacy API key
        const updatedProviders = providers.map(provider => {
          if (provider.id === 'deepseek') {
            return { ...provider, apiKey: value };
          }
          return provider;
        });
        
        // Save the updated providers
        await this.saveApiProviders(updatedProviders);
        
        // Set DeepSeek as the active provider
        await this.setActiveProviderId('deepseek');
        
        // Return the updated DeepSeek provider
        return updatedProviders.find(p => p.id === 'deepseek') || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to migrate legacy API key:', error);
      return null;
    }
  }

  // For backward compatibility: get the API key from the old storage
  static async getApiKey(): Promise<string | null> {
    try {
      const activeProvider = await this.getActiveProvider();
      return activeProvider?.apiKey || null;
    } catch (error) {
      console.error('Failed to load API key:', error);
      return null;
    }
  }

  // For backward compatibility: save the API key to the active provider
  static async saveApiKey(apiKey: string): Promise<void> {
    try {
      const activeProviderId = await this.getActiveProviderId();
      const providers = await this.getApiProviders();
      
      // Update the active provider with the new API key
      const updatedProviders = providers.map(provider => {
        if (provider.id === activeProviderId) {
          return { ...provider, apiKey };
        }
        return provider;
      });
      
      // Save the updated providers
      await this.saveApiProviders(updatedProviders);
      
      // Verify the API key was properly saved by reading it back
      const verifiedProviders = await this.getApiProviders();
      const verifiedProvider = verifiedProviders.find(p => p.id === activeProviderId);
      
      if (verifiedProvider && verifiedProvider.apiKey === apiKey) {
        // Only dispatch the event if the API key was successfully saved
        // Use setTimeout to ensure the event is dispatched after the current execution context
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('apiKeyChanged', { detail: apiKey }));
        }, 0);
      } else {
        console.warn('API key verification failed - saved value does not match');
        // Try saving again with a longer delay
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.saveApiProviders(updatedProviders);
        
        // Dispatch event after the second attempt
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('apiKeyChanged', { detail: apiKey }));
        }, 0);
      }
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

      // Get the active provider
      const activeProvider = await this.getActiveProvider();
      if (!activeProvider) {
        onError('invalid_provider', 'No active provider configured');
        return;
      }

      // Create OpenAI client with provider-specific configuration
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: activeProvider.baseURL,
        dangerouslyAllowBrowser: true // Allow usage in browser
      });

      // Format messages for the API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Create streaming completion
      const stream = await openai.chat.completions.create({
        model: activeProvider.model,
        messages: formattedMessages,
        stream: true
      }, { signal: abortSignal });

      let accumulatedContent = '';
      let tokenUsage = {
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined
      };

      // Process the stream
      for await (const chunk of stream) {
        // Extract content from the chunk
        const contentDelta = chunk.choices[0]?.delta?.content || '';
        
        if (contentDelta) {
          accumulatedContent += contentDelta;
          // Use a Promise to ensure the event is processed before continuing
          await new Promise<void>((resolve) => {
            onChunk(accumulatedContent, tokenUsage);
            // Use setTimeout to allow the UI to update before resolving
            setTimeout(() => resolve(), 0);
          });
        }

        // Check for usage info (typically in the last chunk)
        // The OpenAI SDK doesn't include usage in stream chunks by default
        // We need to cast the chunk to access potential usage data
        const chunkWithUsage = chunk as any;
        if (chunkWithUsage.usage) {
          tokenUsage = {
            promptTokens: chunkWithUsage.usage.prompt_tokens,
            completionTokens: chunkWithUsage.usage.completion_tokens,
            totalTokens: chunkWithUsage.usage.total_tokens
          };
          // Use a Promise to ensure the event is processed before continuing
          await new Promise<void>((resolve) => {
            onChunk(accumulatedContent, tokenUsage);
            // Use setTimeout to allow the UI to update before resolving
            setTimeout(() => resolve(), 0);
          });
        }
      }

      // Make sure to send the final token usage when the stream is complete
      // Use a Promise to ensure the event is processed before completing
      await new Promise<void>((resolve) => {
        onChunk(accumulatedContent, tokenUsage);
        // Use setTimeout to allow the UI to update before resolving
        setTimeout(() => resolve(), 0);
      });

    } catch (error: any) {
      console.error('Error in sendChatRequest:', error);
      
      if (error.name === 'AbortError') {
        // Request was aborted by user, no need to log
      } else if (error.status === 401 || error.status === 403) {
        onError('auth_error', 'Authentication error');
      } else if (error.message && error.message.includes('API key')) {
        onError('invalid_api_key', 'Invalid API key');
      } else {
        onError('network_error', error.message || 'Unknown error');
      }
    }
  }
}