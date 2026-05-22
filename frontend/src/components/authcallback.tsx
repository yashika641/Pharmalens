import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export function AuthCallback({ setUser }: { setUser: (user: any) => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { hash } = window.location;

        if (hash && hash.includes("access_token")) {
          // detectSessionInUrl: false means Supabase won't auto-process the hash.
          // Parse it manually and call setSession to establish the session.
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) throw error;

            if (data?.session?.user) {
              setUser(data.session.user);
              navigate("/", { replace: true });
              return;
            }
          }
        }

        // No hash — check if we already have a valid session (e.g. refresh)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setUser(sessionData.session.user);
          navigate("/", { replace: true });
          return;
        }

        navigate("/", { replace: true });
      } catch (err) {
        console.error("Auth callback error:", err);
        navigate("/", { replace: true });
      }
    };

    handleAuth();
  }, [navigate, setUser]);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      color: "white",
      background: "#0a0e1a"
    }}>
      <p>Logging you in...</p>
    </div>
  );
}
