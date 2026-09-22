import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import Chats from "./pages/Chats";
import Chat from "./pages/Chat";
import Kombo from "./pages/Kombo";
import FaceToFaceCommunicator from "./pages/FaceToFaceCommunicator";
import SignDictionary from "./pages/SignDictionary";
import Contacts from "./pages/Contacts";

import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Protected Assistive Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/chat/:conversationId" element={<Chat />} />
          <Route path="/kombo" element={<Kombo />} />
          <Route path="/face-to-face" element={<FaceToFaceCommunicator />} />
          <Route path="/dictionary" element={<SignDictionary />} />
          <Route path="/contacts" element={<Contacts />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;