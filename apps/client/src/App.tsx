import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./utils/fonts";
import LandingPage from "./pages/user/LandingPage";
import HomePage from "./pages/user/HomePage";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ResetPassword from "./pages/auth/ResetPassword";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage showAuth="login" />} />
        <Route path="/register" element={<LandingPage showAuth="register" />} />
        <Route path="/password/forgot" element={<LandingPage showAuth="forgot" />} />
        <Route path="/auth/verify/:token" element={<VerifyEmail />} />
        <Route path="/password/reset/:token" element={<ResetPassword />} />
        <Route path="/home" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
