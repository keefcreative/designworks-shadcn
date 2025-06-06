// Stripe MCP Integration Service
// This service handles communication with the Stripe MCP server for pricing and checkout

/**
 * Fetches available pricing plans from Stripe MCP
 * Falls back to local pricing.json if MCP is unavailable
 */
export async function getAvailablePlans() {
  try {
    // Note: In a real implementation, this would use the MCP client
    // For now, we'll simulate the MCP call and fall back to local data
    console.log('🔄 Attempting to fetch plans from Stripe MCP...');
    
    // Simulate MCP call - in production this would be:
    // const response = await stripe.mcp.getAvailablePlans();
    
    // For demo purposes, we'll immediately fall back to local data
    // This allows the implementation to work without requiring MCP setup
    throw new Error('MCP simulation - falling back to local data');
    
  } catch (err) {
    console.warn("⚠️ MCP unavailable. Falling back to local pricing.json.", err.message);
    
    try {
      // Import fallback data
      const fallbackModule = await import('../data/pricing.json');
      const fallbackData = fallbackModule.default;
      
      // Transform fallback data to match expected format
      return fallbackData.plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: {
          amount: plan.price.amount,
          currency: plan.price.currency,
          interval: plan.price.interval
        },
        description: plan.description,
        features: plan.features,
        highlighted: plan.highlighted,
        position: plan.position,
        type: plan.type
      }));
      
    } catch (fallbackErr) {
      console.error('❌ Failed to load fallback pricing data:', fallbackErr);
      
      // Return minimal default data if everything fails
      return [
        {
          id: 'default-plan',
          name: 'Standard Package',
          price: {
            amount: 299,
            currency: 'gbp',
            interval: 'month'
          },
          description: 'Our standard service package',
          features: ['Basic Support', 'Standard Features'],
          highlighted: false,
          position: 1,
          type: 'standard'
        }
      ];
    }
  }
}

/**
 * Creates a Stripe checkout session for the given user and plan
 * @param {string} userId - Mock user ID for development
 * @param {string} planId - The plan ID to create checkout for
 * @returns {string|null} - Checkout URL or null if failed
 */
export async function createCheckoutSession(userId, planId) {
  try {
    console.log(`🔄 Creating checkout session for user: ${userId}, plan: ${planId}`);
    
    // Note: In a real implementation, this would use the MCP client:
    // const { url } = await stripe.mcp.createCheckoutSession(userId, planId);
    // return url;
    
    // For demo purposes, simulate checkout creation
    // In production, this would create a real Stripe checkout session
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For demo, redirect to a Stripe-like URL (this would be a real Stripe URL in production)
    const mockCheckoutUrl = `https://checkout.stripe.com/pay/demo#${planId}?user=${userId}`;
    
    console.log(`✅ Mock checkout session created: ${mockCheckoutUrl}`);
    return mockCheckoutUrl;
    
  } catch (err) {
    console.error("❌ Error creating checkout session:", err);
    return null;
  }
}

/**
 * Generates a mock user ID for development purposes
 * In production, this would come from your authentication system
 */
export function generateMockUserId() {
  return `mock-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates plan data structure
 * @param {Object} plan - Plan object to validate
 * @returns {boolean} - Whether the plan is valid
 */
export function validatePlan(plan) {
  const requiredFields = ['id', 'name', 'price', 'description', 'features'];
  
  for (const field of requiredFields) {
    if (!plan[field]) {
      console.warn(`⚠️ Plan missing required field: ${field}`, plan);
      return false;
    }
  }
  
  if (!plan.price.amount || !plan.price.currency) {
    console.warn('⚠️ Plan has invalid price structure', plan.price);
    return false;
  }
  
  if (!Array.isArray(plan.features) || plan.features.length === 0) {
    console.warn('⚠️ Plan has invalid features array', plan.features);
    return false;
  }
  
  return true;
}

/**
 * Transforms raw Stripe MCP data to component-compatible format
 * This function handles the data transformation from Stripe's format
 * to the format expected by our React components
 */
export function transformStripePlan(stripePlan) {
  return {
    id: stripePlan.id,
    name: stripePlan.name || stripePlan.product?.name || 'Unnamed Plan',
    price: {
      amount: stripePlan.unit_amount ? Math.round(stripePlan.unit_amount / 100) : 0,
      currency: stripePlan.currency || 'gbp',
      interval: stripePlan.recurring?.interval || 'month'
    },
    description: stripePlan.description || stripePlan.product?.description || '',
    features: parseFeatures(stripePlan.metadata?.features || stripePlan.product?.marketing_features || ''),
    highlighted: stripePlan.metadata?.highlighted === 'true',
    position: parseInt(stripePlan.metadata?.position || '999', 10),
    type: stripePlan.metadata?.type || 'standard'
  };
}

/**
 * Parses features from various possible formats
 * @param {string|array} features - Features in string or array format
 * @returns {array} - Array of feature strings
 */
function parseFeatures(features) {
  if (Array.isArray(features)) {
    return features.map(f => f.name || f).filter(Boolean);
  }
  
  if (typeof features === 'string') {
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (e) {
      // If not JSON, split by comma
      return features.split(',').map(f => f.trim()).filter(Boolean);
    }
  }
  
  return [];
}
