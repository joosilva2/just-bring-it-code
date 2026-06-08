import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";

const SlugRedirect = () => {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "found" | "not_found">("loading");
  const slug = location.pathname.replace("/", "");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("url_slugs")
        .select("id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      setStatus(data ? "found" : "not_found");
    };
    check();
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  return status === "found" ? <Index /> : <NotFound />;
};

export default SlugRedirect;
