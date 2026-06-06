"use client";

import { useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient, getAuthRedirectUrl } from "@/lib/supabase";

export default function AuthPanel() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [mode, setMode] = useState("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setUserEmail(data.session?.user?.email || "");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || "");
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function submitAuth(event) {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      const credentials = {
        email,
        password,
      };
      const response =
        mode === "sign-up"
          ? await supabase.auth.signUp({
              ...credentials,
              options: { emailRedirectTo: getAuthRedirectUrl(window.location) },
            })
          : await supabase.auth.signInWithPassword(credentials);

      if (response.error) throw response.error;

      setPassword("");
      setStatus(mode === "sign-up" ? "Проверь почту, чтобы подтвердить регистрацию." : "Вход выполнен.");
    } catch (authError) {
      setError(authError.message || "Не удалось выполнить действие.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setIsSubmitting(true);
    setError("");
    setStatus("");

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUserEmail("");
      setStatus("Вы вышли из аккаунта.");
    } catch (authError) {
      setError(authError.message || "Не удалось выйти.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!supabase) {
    return (
      <section className="auth-panel auth-panel-muted" aria-label="Регистрация">
        <span>Аккаунт</span>
        <strong>Supabase не настроен</strong>
        <p>Добавь URL и anon key, и здесь появится регистрация пользователей.</p>
      </section>
    );
  }

  if (userEmail) {
    return (
      <section className="auth-panel" aria-label="Аккаунт пользователя">
        <span>Аккаунт</span>
        <strong>{userEmail}</strong>
        <p>История анализов и личные настройки будут привязаны к этому профилю.</p>
        {status ? <small className="auth-status">{status}</small> : null}
        {error ? <small className="auth-error">{error}</small> : null}
        <button disabled={isSubmitting} onClick={signOut} type="button">
          Выйти
        </button>
      </section>
    );
  }

  return (
    <section className="auth-panel" aria-label="Регистрация пользователя">
      <span>Аккаунт</span>
      <strong>{mode === "sign-up" ? "Регистрация" : "Вход"}</strong>
      <form onSubmit={submitAuth}>
        <label>
          <small>Email</small>
          <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label>
          <small>Пароль</small>
          <input
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {status ? <small className="auth-status">{status}</small> : null}
        {error ? <small className="auth-error">{error}</small> : null}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Подождите" : mode === "sign-up" ? "Создать аккаунт" : "Войти"}
        </button>
      </form>
      <button className="auth-switch" onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")} type="button">
        {mode === "sign-up" ? "Уже есть аккаунт" : "Создать аккаунт"}
      </button>
    </section>
  );
}
