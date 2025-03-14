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

interface ModelConfiguration {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

const MODEL_CONFIGURATIONS_STORAGE = 'api_providers'; // Keep the same storage key for backward compatibility
const ACTIVE_CONFIG_STORAGE = 'active_provider'; // Keep the same storage key for backward compatibility
// Keep the old key for backward compatibility
const LEGACY_API_KEY_STORAGE = 'deepseek_api_key';

// Default configuration
const DEFAULT_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat'
  }
];

export class ChatService {
  // Get all available model configurations
  static async getModelConfigurations(): Promise<ModelConfiguration[]> {
    try {
      const { value } = await Preferences.get({ key: MODEL_CONFIGURATIONS_STORAGE });
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

  // Save all model configurations
  static async saveModelConfigurations(providers: ModelConfiguration[]): Promise<void> {
    try {
      // Save the providers to storage
      await Preferences.set({
        key: MODEL_CONFIGURATIONS_STORAGE,
        value: JSON.stringify(providers),
      });
      
      // Add a longer delay to ensure the data is properly saved
      // before any other operations that might depend on this data
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Verify the data was saved correctly
      const { value } = await Preferences.get({ key: MODEL_CONFIGURATIONS_STORAGE });
      if (!value) {
        console.warn('Failed to verify API providers were saved - no value returned');
        // Try saving again
        await Preferences.set({
          key: MODEL_CONFIGURATIONS_STORAGE,
          value: JSON.stringify(providers),
        });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Failed to save API providers:', error);
      throw error;
    }
  }

  // Get the active configuration ID
  static async getActiveConfigId(): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key: ACTIVE_CONFIG_STORAGE });
      return value || 'deepseek'; // Default to deepseek if not set
    } catch (error) {
      console.error('Failed to load active configuration:', error);
      return 'deepseek';
    }
  }

  // Set the active configuration ID
  static async setActiveConfigId(configId: string): Promise<void> {
    try {
      await Preferences.set({
        key: ACTIVE_CONFIG_STORAGE,
        value: configId,
      });
      // Dispatch event for components to update
      // Use setTimeout to ensure the event is dispatched after the current execution context
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('activeConfigChanged', { detail: configId }));
      }, 0);
    } catch (error) {
      console.error('Failed to save active configuration:', error);
      throw error;
    }
  }

  // Get the active configuration
  static async getActiveConfig(): Promise<ModelConfiguration | null> {
    try {
      const configId = await this.getActiveConfigId();
      const configs = await this.getModelConfigurations();
      
      // Find the active configuration
      const activeConfig = configs.find(p => p.id === configId);
      
      // If no active configuration found, try to migrate from legacy API key
      if (!activeConfig || !activeConfig.apiKey) {
        return await this.migrateLegacyApiKey(configs);
      }
      
      return activeConfig;
    } catch (error) {
      console.error('Failed to get active configuration:', error);
      return null;
    }
  }

  // For backward compatibility: migrate from the old API key storage
  static async migrateLegacyApiKey(configs: ModelConfiguration[]): Promise<ModelConfiguration | null> {
    try {
      const { value } = await Preferences.get({ key: LEGACY_API_KEY_STORAGE });
      if (value) {
        // Update the DeepSeek configuration with the legacy API key
        const updatedConfigs = configs.map(config => {
          if (config.id === 'deepseek') {
            return { ...config, apiKey: value };
          }
          return config;
        });
        
        // Save the updated configurations
        await this.saveModelConfigurations(updatedConfigs);
        
        // Set DeepSeek as the active configuration
        await this.setActiveConfigId('deepseek');
        
        // Return the updated DeepSeek configuration
        return updatedConfigs.find(p => p.id === 'deepseek') || null;
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
      const activeConfig = await this.getActiveConfig();
      return activeConfig?.apiKey || null;
    } catch (error) {
      console.error('Failed to load API key:', error);
      return null;
    }
  }

  // For backward compatibility: save the API key to the active configuration
  static async saveApiKey(apiKey: string): Promise<void> {
    try {
      const activeConfigId = await this.getActiveConfigId();
      const configs = await this.getModelConfigurations();
      
      // Update the active configuration with the new API key
      const updatedConfigs = configs.map(config => {
        if (config.id === activeConfigId) {
          return { ...config, apiKey };
        }
        return config;
      });
      
      // Save the updated configurations
      await this.saveModelConfigurations(updatedConfigs);
      
      // Verify the API key was properly saved by reading it back
      const verifiedConfigs = await this.getModelConfigurations();
      const verifiedConfig = verifiedConfigs.find(p => p.id === activeConfigId);
      
      if (verifiedConfig && verifiedConfig.apiKey === apiKey) {
        // Only dispatch the event if the API key was successfully saved
        // Use setTimeout to ensure the event is dispatched after the current execution context
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent('apiKeyChanged', { detail: apiKey }));
        }, 0);
      } else {
        console.warn('API key verification failed - saved value does not match');
        // Try saving again with a longer delay
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.saveModelConfigurations(updatedConfigs);
        
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

      // Get the active configuration
      const activeConfig = await this.getActiveConfig();
      if (!activeConfig) {
        onError('invalid_config', 'No active configuration configured');
        return;
      }

      // Create OpenAI client with configuration-specific settings
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: activeConfig.baseURL,
        dangerouslyAllowBrowser: true // Allow usage in browser
      });

      // Format messages for the API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Create streaming completion
      const stream = await openai.chat.completions.create({
        model: activeConfig.model,
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