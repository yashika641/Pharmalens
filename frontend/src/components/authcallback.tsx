import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export function AuthCallback({ setUser }: { setUser: (user: any) => void }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // On Android, tokens arrive in the URL hash e.g:
        // pharmalens://auth/callback#access_token=...&refresh_token=...
        const {hash} = window.location;

        if (hash && hash.includes("access_token")) {
          // Let Supabase parse the hash and establish the session
          const { data, error } = await supabase.auth.getSession();

          if (error) throw error;

          if (data?.session?.user) {
            setUser(data.session.user);
            navigate("/", { replace: true });
            return;
          }
        }

        // Fallback: listen for the auth state change event
        // This fires when Supabase processes the URL automatically
        const { data: listenerData } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "SIGNED_IN" && session?.user) {
              setUser(session.user);
              listenerData.subscription.unsubscribe();
              navigate("/", { replace: true });
            }
          }
        );

        // Also try getting session directly as last resort
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          setUser(sessionData.session.user);
          listenerData.subscription.unsubscribe();
          navigate("/", { replace: true });
        }

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