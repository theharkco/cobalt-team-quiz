import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import HostView from "./pages/HostView";
import PlayerView from "./pages/PlayerView";
import QuizCreator from "./pages/QuizCreator";
import NotFound from "./pages/NotFound";
import CanvasHostView from "./pages/CanvasHostView";
import CanvasPlayerView from "./pages/CanvasPlayerView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/host/:sessionId" element={<HostView />} />
          <Route path="/play/:sessionId/:playerId" element={<PlayerView />} />
          <Route path="/canvas-host/:sessionId" element={<CanvasHostView />} />
          <Route path="/canvas/:sessionId/:playerId" element={<CanvasPlayerView />} />
          <Route path="/create" element={<QuizCreator />} />
          <Route path="/create/:quizId" element={<QuizCreator />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
