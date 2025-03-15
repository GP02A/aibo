// Define the advanced configuration options for OpenAI API
export interface AdvancedModelConfiguration {
  // Generation parameters
  temperature?: number;       // Controls randomness: 0-2, default 1
  top_p?: number;            // Controls diversity via nucleus sampling: 0-1, default 1
  n?: number;                // Number of completions to generate, default 1
  stream?: boolean;          // Whether to stream back partial progress, default false
  max_tokens?: number;       // Maximum number of tokens to generate, default varies by model
  presence_penalty?: number; // Penalizes repeated tokens: -2.0 to 2.0, default 0
  frequency_penalty?: number; // Penalizes frequent tokens: -2.0 to 2.0, default 0
  logit_bias?: Record<string, number>; // Modifies likelihood of specified tokens appearing
  
  // Additional parameters
  stop?: string[];           // Sequences where the API will stop generating
  user?: string;             // A unique identifier representing your end-user
}

// ModelConfiguration interface with advanced options
export interface ModelConfiguration {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  advancedConfig?: AdvancedModelConfiguration;
  showAdvancedConfig?: boolean; // Flag to show/hide advanced configuration
}