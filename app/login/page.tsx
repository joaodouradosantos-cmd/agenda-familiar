'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // cookie simples para o middleware saber que já há sessão
        document.cookie = `af_session=1; Path=/; Max-Age=${60 * 60 * 24 * 7}`;
        window.location.href = '/';
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function sendLink() {
    setError(null);
    setSent(false);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h1>Entrar</h1>
      <p>Recebes um link no email para entrares.</p>

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="o.teu@email.com"
        style={{ width: '100%', padding: 10, marginTop: 12 }}
      />

      <button onClick={sendLink} style={{ width: '100%', padding: 10, marginTop: 12 }}>
        Enviar link
      </button>

      {sent && <p style={{ marginTop: 12 }}>Link enviado. Verifica o teu email.</p>}
      {error && <p style={{ marginTop: 12 }}>Erro: {error}</p>}
    </div>
  );
}
