import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ScrollToTop from '@/components/ScrollToTop';
import RaceDay from '@/pages/RaceDay';
import Admin from '@/pages/Admin';
import PageNotFound from '@/lib/PageNotFound';
export default function App() {
  return <QueryClientProvider client={queryClientInstance}>
    <BrowserRouter><ScrollToTop /><Routes>
      <Route path="/" element={<RaceDay />} />
      <Route path="/login" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes></BrowserRouter><Toaster />
  </QueryClientProvider>;
}
