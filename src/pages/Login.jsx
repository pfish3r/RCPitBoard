import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import { safeReturnTo } from '@/lib/authReturnTo';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      await api.auth.loginViaEmailPassword(email, password);
      window.location.href = safeReturnTo() === '/' ? '/admin' : safeReturnTo();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <AuthLayout icon={LogIn} title="Track administrator" subtitle="Sign in to manage this board"
    footer={<Link to="/">Back to pit board</Link>}>
    {error && <p role="alert" className="mb-4 text-destructive">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      <Label htmlFor="email">Admin email</Label>
      <Input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
      <Label htmlFor="password">Password</Label>
      <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
      <Button className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
    </form>
  </AuthLayout>;
}
