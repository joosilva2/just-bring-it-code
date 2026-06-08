import { supabase } from "@/integrations/supabase/client";

const getVisitorId = (): string => {
  let id = localStorage.getItem("visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("visitor_id", id);
  }
  return id;
};

interface LocationData {
  ip: string;
  city: string;
  region: string;
  country: string;
}

const getLocationData = async (): Promise<LocationData | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-location');
    if (error) {
      console.error('Error getting location:', error);
      return null;
    }
    return data as LocationData;
  } catch (err) {
    console.error('Failed to get location:', err);
    return null;
  }
};

export const trackPageView = async (page: string = "/") => {
  const visitor_id = getVisitorId();
  
  // Get location data
  const location = await getLocationData();
  
  await supabase.from("page_views").insert({ 
    visitor_id, 
    page,
    ip_address: location?.ip,
    city: location?.city,
    region: location?.region,
  });
};

export const trackClick = async (clickType: string, colorChosen?: string) => {
  const visitor_id = getVisitorId();
  await supabase.from("click_events").insert({
    visitor_id,
    click_type: clickType,
    color_chosen: colorChosen,
  });
};

export { getVisitorId, getLocationData };
