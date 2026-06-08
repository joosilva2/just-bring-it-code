import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, getLocationData } from "@/lib/tracking";

const INACTIVITY_TIMEOUT = 60_000; // 1 minute

/**
 * Hook that tracks visitor presence in real-time via Supabase Presence.
 * Automatically untracks the visitor after 1 minute of inactivity.
 */
const useVisitorPresence = (channelName: string = "online-users") => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTrackedRef = useRef(false);

  useEffect(() => {
    const visitorId = getVisitorId();

    const channel = supabase.channel(channelName, {
      config: { presence: { key: visitorId } },
    });
    channelRef.current = channel;

    const trackPresence = async () => {
      if (!isTrackedRef.current) {
        try {
          const location = await getLocationData();
          await channel.track({
            online_at: new Date().toISOString(),
            ip: location?.ip ?? "desconhecido",
            city: location?.city,
            region: location?.region,
          });
          isTrackedRef.current = true;
        } catch {
          await channel.track({
            online_at: new Date().toISOString(),
            ip: "desconhecido",
          });
          isTrackedRef.current = true;
        }
      }
      // Reset inactivity timer
      resetInactivityTimer();
    };

    const untrackPresence = async () => {
      if (isTrackedRef.current && channelRef.current) {
        await channelRef.current.untrack();
        isTrackedRef.current = false;
      }
    };

    const resetInactivityTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        untrackPresence();
      }, INACTIVITY_TIMEOUT);
    };

    // Re-track on any user activity
    const handleActivity = () => {
      if (!isTrackedRef.current) {
        // Re-track if previously untracked due to inactivity
        trackPresence();
      } else {
        resetInactivityTimer();
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await trackPresence();
        // Listen for user activity
        events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
      }
    });

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [channelName]);
};

export default useVisitorPresence;
