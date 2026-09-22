import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { VoiceAssistantProvider } from "../../contexts/VoiceAssistantContext";
// AI Voice Assistant widget temporarily disabled for now
// import HandsFreeVoiceAssistant from "../accessibility/HandsFreeVoiceAssistant";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold">
        Loading Convo...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <VoiceAssistantProvider>
      <Outlet />
    </VoiceAssistantProvider>
  );
}