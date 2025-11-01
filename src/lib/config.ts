// API Configuration
export const API_CONFIG = {
  // URL вашего API на Timeweb
  baseUrl: 'https://api.looktime.pro',
  
  // Таймауты
  timeout: 15000,
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000,
};

// Проверка доступности API
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_CONFIG.baseUrl}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};
