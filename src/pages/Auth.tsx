import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Auth() {
  // Показ статуса на экране
  const [tgStatus, setTgStatus] = useState("⏳ Проверка Telegram...");

  // Автовход через Telegram WebApp
  useEffect(() => {
    async function loginByTelegram() {
      try {
        const initData = (window as any)?.Telegram?.WebApp?.initData || "";
        const api = import.meta.env.VITE_API_URL || "https://api.looktime.pro";
        const url = `${api}/tg/login`;

        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });
        const data = await r.json();

        if (data?.ok) {
          localStorage.setItem("solo_user", JSON.stringify(data.user || {}));
          setTgStatus("✅ Telegram login OK");
          // если хочешь — сразу уводим на дашборд:
          // navigate('/dashboard');
        } else {
          setTgStatus("❌ Telegram login fail");
        }
      } catch (e) {
        setTgStatus("⚠️ Ошибка подключения");
      }
    }

    loginByTelegram();
  }, []);

  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success("Регистрация успешна!");
      } else {
        await signIn(email, password);
        toast.success("Добро пожаловать!");
      }
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background p-4">
      <p style={{ textAlign: "center", color: "#777", marginBottom: "10px" }}>{tgStatus}</p>

      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">LookTime</h1>
          <p className="text-muted-foreground">{isSignUp ? "Создайте аккаунт" : "Войдите в систему"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Загрузка..." : isSignUp ? "Зарегистрироваться" : "Войти"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            {isSignUp ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
