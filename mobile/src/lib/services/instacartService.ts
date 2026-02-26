import { API_CONFIG } from './apiConfig';

export interface InstacartLinkResult {
  success: boolean;
  url?: string;
  expiresAt?: string;
  error?: string;
}

export const instacartService = {
  // Create a shoppable link from shopping list
  // This works with both dev and production keys
  async createShoppingListLink(
    items: Array<{ name: string; quantity?: number; unit?: string; displayText?: string }>,
    locationContext?: any
  ): Promise<InstacartLinkResult> {
    try {
      const lineItems = items.map((item) => ({
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || null,
        display_text: item.displayText || item.name,
      }));

      const response = await fetch(
        `${API_CONFIG.instacart.activeUrl}/idp/v1/products/products_link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `InstacartAPI ${API_CONFIG.instacart.apiKey}`,
          },
          body: JSON.stringify({
            title: 'PantryIQ Shopping List',
            image_url: null,
            link_type: 'shopping_list',
            line_items: lineItems,
            landing_page_configuration: {
              partner_linkback_url: null,
              enable_pantry_items: false,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(`Instacart link creation failed: ${error}`);
        return { success: false, error };
      }

      const data = await response.json() as any;

      return {
        success: true,
        url: data.url,
        expiresAt: data.expires_at,
      };
    } catch (error) {
      console.error('Create Instacart link error:', error);
      return { success: false, error: String(error) };
    }
  },

  // Create shoppable recipe link
  async createRecipeLink(
    recipe: { name: string; ingredients: string[]; imageUrl?: string },
    servings: number = 1
  ): Promise<InstacartLinkResult> {
    try {
      const lineItems = (recipe.ingredients || []).map((ingredient) => ({
        name: ingredient,
        display_text: ingredient,
      }));

      const response = await fetch(
        `${API_CONFIG.instacart.activeUrl}/idp/v1/products/products_link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `InstacartAPI ${API_CONFIG.instacart.apiKey}`,
          },
          body: JSON.stringify({
            title: recipe.name,
            image_url: recipe.imageUrl || null,
            link_type: 'recipe',
            line_items: lineItems,
            landing_page_configuration: {
              partner_linkback_url: null,
              enable_pantry_items: false,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error(`Recipe link creation failed: ${error}`);
        return { success: false, error };
      }

      const data = await response.json() as any;

      return {
        success: true,
        url: data.url,
      };
    } catch (error) {
      console.error('Create recipe link error:', error);
      return { success: false, error: String(error) };
    }
  },
};
