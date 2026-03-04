import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { IdeasProvider } from "@/contexts/IdeasContext";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import Submit from "./pages/Submit";
import Dashboard from "./pages/Dashboard";
import IdeaDetail from "./pages/IdeaDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <IdeasProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/submit/:id" element={<Submit />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/idea/:id" element={<IdeaDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </IdeasProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
