import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const MyAppointments = lazy(() => import("./pages/MyAppointments"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionBlocked = lazy(() => import("./pages/SubscriptionBlocked"));
const PaymentResult = lazy(() => import("./pages/PaymentResult"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-lg">Загрузка...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/1" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/calendar" element={<Dashboard mode="calendar" />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/subscription-blocked" element={<SubscriptionBlocked />} />
            <Route path="/payment-result" element={<PaymentResult />} />
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/my-appointments" element={<MyAppointments />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
