import { Preferences } from '@capacitor/preferences';
import OpenAI from 'openai';
import i18n from '../i18n';


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
  static async sendChatRequest({
    messages,
    config,
    onUpdate,
    onComplete,
    onError,
    onTokenUsage,
    signal
  }: {
    messages: { role: 'user' | 'assistant'; content: string }[];
    config: ModelConfiguration;
    onUpdate?: (content: string) => void;
    onComplete?: (content: string) => void;
    onError?: (error: any) => void;
    onTokenUsage?: (usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number }) => void;
    signal?: AbortSignal;
  }) {
    // Declare variables that need to be accessed in both try and catch blocks
    let isStreaming = false;
    let fullContent = '';
    
    try {
      // Validate configuration
      if (!config) {
        throw new Error('no_active_config');
      }

      if (!config.apiKey) {
        throw new Error('API key is required');
      }

      // Create OpenAI client with the provided configuration
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        dangerouslyAllowBrowser: true // Allow browser usage
      });

      // Determine if streaming is enabled
      isStreaming = config.advancedConfig?.stream === true;

      // Prepare request parameters
      const requestParams = {
        model: config.model,
        messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
        temperature: config.advancedConfig?.temperature,
        top_p: config.advancedConfig?.top_p,
        frequency_penalty: config.advancedConfig?.frequency_penalty,
        presence_penalty: config.advancedConfig?.presence_penalty,
        max_tokens: config.advancedConfig?.max_tokens,
        stream: isStreaming
      };

      if (isStreaming) {
        // Handle streaming response
        fullContent = ''; // Use the outer variable instead of declaring a new one
        let wasAborted = false;
        const stream = await openai.chat.completions.create({
          ...requestParams,
          stream: true
        }, { signal });

        for await (const chunk of stream) {
          // Check if the request was aborted
          if (signal?.aborted) {
            wasAborted = true;
            break;
          }

          const content = chunk.choices[0]?.delta?.content || '';
          fullContent += content;
          
          // Call the update callback with the current content
          if (onUpdate) {
            onUpdate(fullContent);
          }
        }

        // If the request was aborted, add a cancellation message
        if (wasAborted) {
          // Add a divider if there's already content
          const cancellationMessage = fullContent.length > 0 ? 
            `\n\n---\n\n${i18n.t('chat.errors.request_cancelled')}` : 
            i18n.t('chat.errors.request_cancelled');
          
          fullContent += cancellationMessage;
          
          // Update the UI with the cancellation message
          if (onUpdate) {
            onUpdate(fullContent);
          }
        }

        // Even if not aborted during streaming, check again before completing
        // This handles cases where abort happens between the end of streaming and completion
        if (signal?.aborted && !wasAborted) {
          // Add a divider if there's already content
          const cancellationMessage = fullContent.length > 0 ? 
            `\n\n---\n\n${i18n.t('chat.errors.request_cancelled')}` : 
            i18n.t('chat.errors.request_cancelled');
          
          fullContent += cancellationMessage;
          
          // Update the UI with the cancellation message
          if (onUpdate) {
            onUpdate(fullContent);
          }
        }

        // Call the complete callback with the final content
        if (onComplete) {
          onComplete(fullContent);
        }

        // Check if the stream response contains usage information (newer API versions may include this)
        // Only call onTokenUsage if we have actual usage data from the API
        if (onTokenUsage && !signal?.aborted && 'usage' in stream) {
          const usage = (stream as any).usage;
          if (usage) {
            onTokenUsage({
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens
            });
          }
        }
        // Note: We no longer make an additional API call to get token usage for streaming responses
        // as newer API versions may include this data directly in the streaming response
      } else {
        // Handle non-streaming response
        const response = await openai.chat.completions.create({
          ...requestParams,
          stream: false
        }, { signal });

        const content = response.choices[0]?.message?.content || '';
        
        // Call the complete callback with the final content
        if (onComplete) {
          onComplete(content);
        }

        // Get token usage if available
        if (onTokenUsage && response.usage) {
          onTokenUsage({
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          });
        }
      }
    } catch (error: any) {
      // Handle errors
      if (signal?.aborted) {
        // If the request was aborted by the user, we need to ensure the cancellation message is shown
        console.log('Request was cancelled by user');
        
        // For streaming responses, we might need to add the cancellation message here as well
        // in case the abort happened after the for-await loop but before completion
        if (isStreaming && onUpdate) {
          // Get the current content if available (from closure)
          // We need to append to existing content rather than just sending the message alone
          const cancellationMessage = fullContent && fullContent.length > 0 ?
            fullContent + `\n\n---\n\n${i18n.t('chat.errors.request_cancelled')}` :
            i18n.t('chat.errors.request_cancelled');
          onUpdate(cancellationMessage);
        }
        return;
      }

      // Handle other errors
      console.error('Chat request error:', error);
      
      // Determine error type
      let errorType = 'unknown_error';
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('authentication') || errorMessage.includes('API key')) {
        errorType = 'auth_error';
      } else if (errorMessage.includes('network') || errorMessage.includes('connect')) {
        errorType = 'network_error';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorType = 'rate_limit_error';
      } else if (errorMessage.includes('timeout')) {
        errorType = 'timeout_error';
      } else if (errorMessage.includes('content filter') || errorMessage.includes('moderation')) {
        errorType = 'content_filter_error';
      } else if (errorMessage === 'no_active_config') {
        errorType = 'no_active_config';
      } else if (errorMessage.includes('config')) {
        errorType = 'config_error';
      }
      
      if (onError) {
        onError({ type: errorType, message: errorMessage });
      }
    }
  }
}