import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { preloadSpeechVoices } from "@/lib/speech";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    preloadSpeechVoices();
    const warmVoices = () => preloadSpeechVoices();
    window.addEventListener("pointerdown", warmVoices, { once: true });
    window.addEventListener("keydown", warmVoices, { once: true });
    return () => {
      window.removeEventListener("pointerdown", warmVoices);
      window.removeEventListener("keydown", warmVoices);
    };
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {!isSupabaseConfigured && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm">
          Supabase is not configured. Add <code className="font-mono">VITE_SUPABASE_URL</code> and{" "}
          <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> in Vercel environment variables, then redeploy.
        </div>
      )}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
