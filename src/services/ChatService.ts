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
      // 1. Check if there's an active configuration
      const activeConfig = await this.getActiveConfig();
      if (!activeConfig) {
        onError('no_active_config', 'Please set an active configuration before sending messages');
        return;
      }
      
      // We'll let the OpenAI SDK handle configuration validation errors naturally

      // Create OpenAI client
      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: activeConfig.baseURL,
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

      // Check for abort before making the API call
      if (abortSignal.aborted) {
        onError('request_cancelled', 'Chat response stopped by user');
        return;
      }

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
        try {
          for await (const chunk of stream) {
            // Check if request was aborted during streaming
            if (abortSignal.aborted) {
              onError('request_cancelled', 'Chat response stopped by user');
              return;
            }

          // Get content delta
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            accumulatedContent += content;
            // Only update content during streaming, don't pass incomplete token usage
            onUpdate(accumulatedContent);
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
        } catch (streamError: any) {
          // Handle streaming-specific errors
          console.error('Streaming error:', streamError);
          
          // Check if this was an abort/cancellation
          if (abortSignal.aborted || 
              streamError.name === 'AbortError' || 
              streamError.code === 'ABORT_ERR' || 
              streamError.message?.includes('abort') || 
              streamError.message?.includes('cancel')) {
            onError('request_cancelled', 'Chat response stopped by user');
            return;
          }
          
          // If we already have some content, provide it to the user with an error note
          if (accumulatedContent) {
            onUpdate(accumulatedContent + '\n\n[Error: Stream interrupted. ' + 
              (streamError.message || 'Connection issue with API provider') + ']', tokenUsage);
          } else {
            // Otherwise, throw to be caught by the main error handler
            throw streamError;
          }
        }
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

        // Check if request was aborted after completion
        if (abortSignal.aborted) {
          onError('request_cancelled', 'Chat response stopped by user');
          return;
        }

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
      // Log all errors except abort errors for debugging
      if (error.name !== 'AbortError') {
        console.error('Error in sendChatRequest:', error);
      }

      // Categorize errors into specific types for better user feedback
      // Enhanced abort detection - check for various ways providers might indicate an aborted request
      if (error.name === 'AbortError' || 
          error.code === 'ABORT_ERR' || 
          error.message?.includes('abort') || 
          error.message?.includes('cancel') || 
          error.message?.includes('aborted') || 
          error.message?.toLowerCase()?.includes('user interrupt') || 
          abortSignal.aborted) {
        // User cancelled the request
        onError('request_cancelled', 'Chat response stopped by user');
      } else if (error.status === 401 || error.message?.includes('authentication') || error.message?.includes('auth') || error.message?.includes('API key')) {
        // Authentication errors (invalid API key, expired token, etc.)
        onError('auth_error', 'Authentication failed. Please check your API key and configuration settings.');
      } else if (error.message?.includes('missing') && error.message?.includes('API key')) {
        // Missing API key
        onError('config_error', 'API key is missing. Please add your API key in the configuration settings.');
      } else if (error.message?.includes('invalid') && error.message?.includes('API key')) {
        // Invalid API key format
        onError('config_error', 'Invalid API key format. Please check your API key in the configuration settings.');
      } else if (error.message?.includes('URL') || error.message?.includes('baseURL') || error.message?.includes('endpoint')) {
        // Base URL related errors
        onError('config_error', 'Invalid Base URL. Please check your Base URL in the configuration settings.');
      } else if (error.message?.includes('model') || error.message?.includes('not found') || error.message?.includes('not available')) {
        // Model-related errors
        onError('config_error', 'Model error. The specified model may not exist or is not available with your current plan.');
      } else if (error.message?.includes('parameter') || error.message?.includes('invalid request')) {
        // Parameter validation errors
        onError('config_error', `Configuration parameter error: ${error.message}. Please check your advanced configuration settings.`);
      } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED') || error.message?.includes('ETIMEDOUT') || error.message?.includes('fetch')) {
        // Network-related errors
        onError('network_error', 'Network error. Please check your internet connection and try again.');
      } else if (error.message?.includes('rate limit') || error.message?.includes('quota') || error.message?.includes('exceeded')) {
        // Rate limiting or quota issues
        onError('rate_limit_error', 'Rate limit exceeded. Please try again later or check your subscription plan.');
      } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
        // Timeout errors
        onError('timeout_error', 'Request timed out. Please try again later.');
      } else if (error.message?.includes('content filter') || error.message?.includes('moderation') || error.message?.includes('policy')) {
        // Content filtering/moderation issues
        onError('content_filter_error', 'Your message was flagged by content filters. Please modify your request and try again.');
      } else if (error.message?.includes('temperature') || error.message?.includes('top_p') || error.message?.includes('max_tokens') || 
                error.message?.includes('frequency_penalty') || error.message?.includes('presence_penalty')) {
        // Advanced configuration parameter errors
        onError('config_error', `Advanced configuration error: ${error.message}. Please check your advanced settings.`);
      } else {
        // Fallback for any other errors
        onError('unknown_error', `An unexpected error occurred: ${error.message || 'Unknown error'}. Please check your configuration settings.`);
      }
    }
  }
}