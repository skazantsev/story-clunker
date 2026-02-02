import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  subscribed: boolean;
  subscriptionEnd: string | null;
  isLoading: boolean;
}

export const useSubscription = (userId: string | null) => {
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    subscriptionEnd: null,
    isLoading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!userId) {
      setState({ subscribed: false, subscriptionEnd: null, isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) throw error;

      setState({
        subscribed: data.subscribed || false,
        subscriptionEnd: data.subscription_end || null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      throw error;
    }
  };

  return {
    ...state,
    subscribe,
    refreshSubscription: checkSubscription,
  };
};
