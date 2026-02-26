// Secure API configuration for PantryIQ Smart Shopping

export const API_CONFIG = {
  kroger: {
    clientId: 'YOUR_KROGER_CLIENT_ID',
    clientSecret: 'YOUR_KROGER_CLIENT_SECRET',
    baseUrl: 'https://api.kroger.com/v1',
    tokenUrl: 'https://api.kroger.com/v1/connect/oauth2/token',
    scopes: 'product.compact',
  },
  instacart: {
    apiKey: 'YOUR_INSTACART_API_KEY',
    baseUrl: 'https://connect.instacart.com',
    devUrl: 'https://connect.dev.instacart.tools',
    // Switch to baseUrl when production key arrives
    // Switch to devUrl while testing with development key
    activeUrl: 'https://connect.dev.instacart.tools',
  },
};
