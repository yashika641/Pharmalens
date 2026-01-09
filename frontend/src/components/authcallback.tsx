import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabase"; // adjust path if needed

export function AuthCallback({ setUser }: { setUser: (user: any) => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error);
        navigate("/");
        return;
      }

      if (data?.session?.user) {
        // ✅ SET USER IN REACT STATE
        setUser(data.session.user);
      }

      navigate("/", { replace: true });
    };

    handleAuth();
  }, [navigate, setUser]);

  return <p>Logging you in...</p>;
}
