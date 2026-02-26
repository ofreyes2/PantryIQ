import { apiKeyManager } from './apiKeyManager';
import { API_CONFIG } from './apiConfig';

export interface KrogerStore {
  id: string;
  name: string;
  chain: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  hours: string[];
  displayName: string;
}

export interface ProductPrice {
  id: string;
  name: string;
  brand: string;
  size: string;
  price: number | null;
  salePrice: number | null;
  onSale: boolean;
  savings: string | null;
  savingsPercent: number | null;
  imageUrl: string | null;
  upc: string;
  inStock: boolean;
}

export interface PriceCheckResult {
  items: Array<{
    shoppingItem: { name: string; quantity: number; unit: string };
    product: ProductPrice | null;
    found: boolean;
    effectivePrice: number;
    regularPrice: number;
  }>;
  summary: {
    totalRegularPrice: string;
    totalSalePrice: string;
    totalSavings: string;
    itemsFound: number;
    itemsNotFound: number;
    itemsOnSale: number;
    itemsTotal: number;
  };
}

export const krogerService = {
  // Find nearest Kroger family stores by zip code
  async findNearbyStores(zipCode: string, radiusMiles: number = 10): Promise<KrogerStore[]> {
    try {
      const token = await apiKeyManager.getKrogerToken();
      if (!token) {
        console.error('No Kroger token available');
        return [];
      }

      const response = await fetch(
        `${API_CONFIG.kroger.baseUrl}/locations?` +
          `filter.zipCode.near=${zipCode}` +
          `&filter.radiusInMiles=${radiusMiles}` +
          `&filter.limit=5`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Stores request failed: ${response.status}`);
        return [];
      }

      const data = await response.json() as any;

      return (
        data.data?.map((store: any) => ({
          id: store.locationId,
          name: store.name,
          chain: store.chain,
          address: store.address?.addressLine1,
          city: store.address?.city,
          state: store.address?.state,
          zip: store.address?.zipCode,
          phone: store.phone,
          hours: store.hours || [],
          displayName: `${store.name} — ${store.address?.city}`,
        })) || []
      );
    } catch (error) {
      console.error('Find stores error:', error);
      return [];
    }
  },

  // Search for a product and get pricing at specific store
  async searchProduct(searchTerm: string, locationId: string): Promise<ProductPrice | null> {
    try {
      const token = await apiKeyManager.getKrogerToken();
      if (!token) {
        console.error('No Kroger token available');
        return null;
      }

      const params = new URLSearchParams({
        'filter.term': searchTerm,
        'filter.limit': '5',
      });

      if (locationId) {
        params.append('filter.locationId', locationId);
      }

      const response = await fetch(
        `${API_CONFIG.kroger.baseUrl}/products?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Product search failed: ${response.status}`);
        return null;
      }

      const data = await response.json() as any;
      const products = data.data || [];

      if (products.length === 0) return null;

      // Return best match with pricing
      const best = products[0];
      const priceInfo = best.items?.[0]?.price;

      return {
        id: best.productId,
        name: best.description,
        brand: best.brand || 'Unknown',
        size: best.items?.[0]?.size || 'Standard',
        price: priceInfo?.regular || null,
        salePrice: priceInfo?.promo || null,
        onSale: priceInfo?.promo && priceInfo.promo < priceInfo.regular,
        savings:
          priceInfo?.promo && priceInfo.regular
            ? (priceInfo.regular - priceInfo.promo).toFixed(2)
            : null,
        savingsPercent:
          priceInfo?.promo && priceInfo.regular
            ? Math.round((1 - priceInfo.promo / priceInfo.regular) * 100)
            : null,
        imageUrl:
          best.images?.[0]?.sizes?.find((s: any) => s.size === 'medium')?.url ||
          null,
        upc: best.upc || '',
        inStock: best.items?.[0]?.inventory?.status === 'In Stock',
      };
    } catch (error) {
      console.error(`Search product error for ${searchTerm}:`, error);
      return null;
    }
  },

  // Price check entire shopping list
  async priceShoppingList(
    shoppingItems: Array<{ name: string; quantity: number; unit: string }>,
    locationId: string
  ): Promise<PriceCheckResult> {
    const results = [];
    let totalRegular = 0;
    let totalSale = 0;
    let itemsOnSale = 0;
    let itemsNotFound = 0;

    // Process items with small delay to respect rate limits
    for (const item of shoppingItems) {
      const product = await this.searchProduct(item.name, locationId);

      // Add small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (product) {
        const effectivePrice = product.salePrice || product.price || 0;
        const regularPrice = product.price || 0;

        totalRegular += regularPrice;
        totalSale += effectivePrice;

        if (product.onSale) itemsOnSale++;

        results.push({
          shoppingItem: item,
          product,
          found: true,
          effectivePrice,
          regularPrice,
        });
      } else {
        itemsNotFound++;
        results.push({
          shoppingItem: item,
          product: null,
          found: false,
          effectivePrice: 0,
          regularPrice: 0,
        });
      }
    }

    return {
      items: results,
      summary: {
        totalRegularPrice: totalRegular.toFixed(2),
        totalSalePrice: totalSale.toFixed(2),
        totalSavings: (totalRegular - totalSale).toFixed(2),
        itemsFound: results.filter((r) => r.found).length,
        itemsNotFound,
        itemsOnSale,
        itemsTotal: shoppingItems.length,
      },
    };
  },
};
