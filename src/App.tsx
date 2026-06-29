import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getBackendConfigIssue, isBackendConfigured } from "@/lib/backend-config";
import Index from "./pages/Index.tsx";
import VetPortal from "./pages/VetPortal.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        {getBackendConfigIssue() && (
          <div className="shrink-0 bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm">
            {getBackendConfigIssue()}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/vet" element={<VetPortal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
