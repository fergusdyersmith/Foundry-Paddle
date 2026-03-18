import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import TheSport from "./pages/TheSport";
import TheClub from "./pages/TheClub";
import Memberships from "./pages/Memberships";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Book from "./pages/Book";

import NotFound from "./pages/NotFound";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/fullsite" element={<Index />} />
          <Route path="/fullsite/the-sport" element={<TheSport />} />
          <Route path="/fullsite/the-club" element={<TheClub />} />
          <Route path="/fullsite/memberships" element={<Memberships />} />
          <Route path="/fullsite/faq" element={<FAQ />} />
          <Route path="/fullsite/contact" element={<Contact />} />
          <Route path="/fullsite/book" element={<Book />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
