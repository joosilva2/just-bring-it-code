import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

// Lazy-load every non-home route so the homepage bundle stays small.
// Heavy admin/dashboard pages (recharts ~221KB, etc.) are no longer
// in the initial chunk.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminCheckout = lazy(() => import("./pages/AdminCheckout"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const ReturnsPolicy = lazy(() => import("./pages/ReturnsPolicy"));
const ShippingPolicy = lazy(() => import("./pages/ShippingPolicy"));
const ShippingNotice = lazy(() => import("./pages/ShippingNotice"));
const Contact = lazy(() => import("./pages/Contact"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PixPayment = lazy(() => import("./pages/PixPayment"));
const TikTokAdsDashboard = lazy(() => import("./pages/TikTokAdsDashboard"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const AdminUrls = lazy(() => import("./pages/AdminUrls"));
const TaxaNfe = lazy(() => import("./pages/TaxaNfe"));
const SwitchGateway = lazy(() => import("./pages/SwitchGateway"));
const SlugRedirect = lazy(() => import("./components/SlugRedirect"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-gray-100" aria-hidden />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
            <HashRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin1" element={<AdminLeads />} />
            <Route path="/resultados" element={<Dashboard />} />
            <Route path="/admincheckout" element={<AdminCheckout />} />
            <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos-de-uso" element={<TermsOfUse />} />
            <Route path="/trocas-e-devolucoes" element={<ReturnsPolicy />} />
            
            <Route path="/politica-envio" element={<ShippingPolicy />} />
            <Route path="/contato" element={<Contact />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pix" element={<PixPayment />} />
            <Route path="/bmtt" element={<TikTokAdsDashboard />} />
            <Route path="/produto/:slug" element={<ProductPage />} />
            <Route path="/creme" element={<ProductPage />} />
            <Route path="/envioup" element={<ShippingNotice />} />
            <Route path="/nfe" element={<ThankYou />} />
            <Route path="/taxa" element={<TaxaNfe />} />
            <Route path="/obrigado" element={<OrderConfirmation />} />
            <Route path="/admurl" element={<AdminUrls />} />
            <Route path="/gateway" element={<SwitchGateway />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<SlugRedirect />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
