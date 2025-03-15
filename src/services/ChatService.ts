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

// Import the ExtendedModelConfiguration interface from types
import { ModelConfiguration } from '../components/api-settings/types';

// Storage keys
const MODEL_CONFIGS_STORAGE = 'model_configurations';
const ACTIVE_CONFIG_ID = 'active_config_id';

// Default configurations for different providers
const DEFAULT_CONFIGURATIONS: ModelConfiguration[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    advancedConfig: {
      temperature: 1,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: true,
      max_tokens: 2048
    },
    showAdvancedConfig: false
  }
];

export class ChatService {
  // Get all model configurations
  static async getModelConfigurations(): Promise<ModelConfiguration[]> {
    try {
      const { value } = await Preferences.get({ key: MODEL_CONFIGS_STORAGE });
      if (value) {
        return JSON.parse(value);
      }
      // Return default configurations if none exist
      await this.saveModelConfigurations(DEFAULT_CONFIGURATIONS);
      return DEFAULT_CONFIGURATIONS;
    } catch (error) {
      console.error('Failed to get model configurations:', error);
      return DEFAULT_CONFIGURATIONS;
    }
  }

  // Save model configurations
  static async saveModelConfigurations(configs: ModelConfiguration[]): Promise<void> {
    try {
      await Preferences.set({
        key: MODEL_CONFIGS_STORAGE,
        value: JSON.stringify(configs),
      });
      
      // Dispatch event to notify components of configuration changes
      document.dispatchEvent(new CustomEvent('modelConfigurationsChanged', {
        detail: configs
      }));
    } catch (error) {
      console.error('Failed to save model configurations:', error);
      throw error;
    }
  }

  // Get active configuration ID
  static async getActiveConfigId(): Promise<string> {
    try {
      const { value } = await Preferences.get({ key: ACTIVE_CONFIG_ID });
      return value || '';
    } catch (error) {
      console.error('Failed to get active configuration ID:', error);
      return '';
    }
  }

  // Set active configuration ID
  static async setActiveConfigId(configId: string): Promise<void> {
    try {
      await Preferences.set({
        key: ACTIVE_CONFIG_ID,
        value: configId,
      });
      
      // Dispatch event to notify components of active configuration change
      document.dispatchEvent(new CustomEvent('activeConfigChanged', {
        detail: configId
      }));
    } catch (error) {
      console.error('Failed to set active configuration ID:', error);
      throw error;
    }
  }

  // Get active configuration
  static async getActiveConfig(): Promise<ModelConfiguration | null> {
    try {
      const configId = await this.getActiveConfigId();
      if (!configId) return null;
      
      const configs = await this.getModelConfigurations();
      return configs.find(config => config.id === configId) || null;
    } catch (error) {
      console.error('Failed to get active configuration:', error);
      return null;
    }
  }

  // Send chat request to the API
  static async sendChatRequest(
    apiKey: string,
    messages: Message[],
    abortSignal: AbortSignal,
    onUpdate: (content: string, tokenUsage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }) => void,
    onError: (errorType: string, errorMessage: string) => void
  ): Promise<void> {
    try {
      // Get active configuration
      const activeConfig = await this.getActiveConfig();
      if (!activeConfig) {
        onError('config_error', 'No active configuration found');
        return;
      }

      // Validate API key
      if (!apiKey) {
        onError('invalid_api_key', 'API key is required');
        return;
      }

      // Create OpenAI client
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: activeConfig.baseURL || undefined,
        dangerouslyAllowBrowser: true // Allow browser usage
      });

      // Format messages for OpenAI API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get advanced configuration options
      const advancedConfig = activeConfig.advancedConfig || {};
      const useStream = advancedConfig.stream === true;

      if (useStream) {
        // Create chat completion with streaming
        const stream = await openai.chat.completions.create({
          model: activeConfig.model,
          messages: formattedMessages,
          stream: true,
          temperature: advancedConfig.temperature,
          max_tokens: advancedConfig.max_tokens,
          top_p: advancedConfig.top_p,
          frequency_penalty: advancedConfig.frequency_penalty,
          presence_penalty: advancedConfig.presence_penalty,
          ...(advancedConfig.stop && { stop: advancedConfig.stop }),
          ...(advancedConfig.logit_bias && { logit_bias: advancedConfig.logit_bias }),
          ...(advancedConfig.user && { user: advancedConfig.user }),
        }, {
          signal: abortSignal
        });

        let accumulatedContent = '';
        let tokenUsage = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        };

        // Process streaming response
        for await (const chunk of stream) {
          // Check if request was aborted
          if (abortSignal.aborted) {
            // Call onError with abort type when aborted during streaming
            onError('abort', 'Request was aborted');
            return; // Exit the function early
          }

          // Get content delta
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            accumulatedContent += content;
            onUpdate(accumulatedContent, tokenUsage);
          }

          // Update token usage if available
          if (chunk.usage) {
            tokenUsage = {
              promptTokens: chunk.usage.prompt_tokens,
              completionTokens: chunk.usage.completion_tokens,
              totalTokens: chunk.usage.total_tokens
            };
          }
        }

        // Final update with token usage
        onUpdate(accumulatedContent, tokenUsage);
      } else {
        // Non-streaming request
        const response = await openai.chat.completions.create({
          model: activeConfig.model,
          messages: formattedMessages,
          stream: false,
          temperature: advancedConfig.temperature,
          max_tokens: advancedConfig.max_tokens,
          top_p: advancedConfig.top_p,
          frequency_penalty: advancedConfig.frequency_penalty,
          presence_penalty: advancedConfig.presence_penalty,
          ...(advancedConfig.stop && { stop: advancedConfig.stop }),
          ...(advancedConfig.logit_bias && { logit_bias: advancedConfig.logit_bias }),
          ...(advancedConfig.user && { user: advancedConfig.user }),
        }, {
          signal: abortSignal
        });

        // Get the complete response content
        const content = response.choices[0]?.message?.content || '';
        
        // Get token usage if available
        const tokenUsage = response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined;

        // Send the complete response at once
        onUpdate(content, tokenUsage);
      }
    } catch (error: any) {
      // Only log errors that aren't abort errors (which are expected when user cancels)
      if (error.name !== 'AbortError') {
        console.error('Error in sendChatRequest:', error);
      }

      // Handle different error types
      if (error.name === 'AbortError') {
        onError('abort', 'Request was aborted');
      } else if (error.status === 401) {
        onError('auth_error', 'Authentication error');
      } else if (error.message?.includes('API key')) {
        onError('invalid_api_key', 'Invalid API key');
      } else if (error.message?.includes('network')) {
        onError('network_error', 'Network error');
      } else {
        onError('unknown_error', error.message || 'Unknown error');
      }
    }
  }
}