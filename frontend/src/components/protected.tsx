import { Navigate } from "react-router-dom";
import { JSX } from "react/jsx-runtime";

export function ProtectedRoute({
  user,
  children,
}: {
  user: any;
  children: JSX.Element;
}) {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
