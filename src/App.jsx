import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import RaceDay from '@/pages/RaceDay';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageNotFound from '@/lib/PageNotFound';
export default function App() {
  return <AuthProvider><QueryClientProvider client={queryClientInstance}>
    <BrowserRouter><ScrollToTop /><Routes>
      <Route path="/" element={<RaceDay />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login?returnTo=/admin" replace />} />}>
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes></BrowserRouter><Toaster />
  </QueryClientProvider></AuthProvider>;
}
