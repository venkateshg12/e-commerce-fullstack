import React from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/modal";
import Signin from "@/pages/auth/Signin";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

interface LandingPageProps {
  showAuth?: "login" | "register" | "forgot";
}

const LandingPage: React.FC<LandingPageProps> = ({ showAuth }) => {
  const navigate = useNavigate();
  const image_url =
    "https://images.unsplash.com/photo-1779896412253-b5c31454aed9?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Background Image with Dark Overlay */}
      <img
        src={image_url}
        alt="E-Commerce Hero Background"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-black/45" />

      {/* Floating Glassmorphism Navbar */}
      <header className="absolute top-4 left-4 right-4 z-30 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <div className="p-2 bg-linear-to-r from-blue-500 to-indigo-600 rounded-lg text-white animate-pulse">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="font-lato font-bold text-xl tracking-wider text-white bg-linear-to-r from-white to-gray-300 bg-clip-text ">
            E-SHOP
          </span>
        </div>

        {/* Navigation links - hidden on small screens */}
        <nav className="hidden md:flex items-center gap-8 font-ubuntuMono text-sm font-semibold tracking-widest text-white/80">
          <a href="#" className="hover:text-white transition-colors duration-200">
            HOME
          </a>
          <a href="#" className="hover:text-white transition-colors duration-200">
            SHOP
          </a>
          <a href="#" className="hover:text-white transition-colors duration-200">
            ABOUT
          </a>
          <a href="#" className="hover:text-white transition-colors duration-200">
            CONTACT
          </a>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/login")}
            className="text-white hover:bg-white/10 hover:text-white font-lato font-bold tracking-widest text-xs md:text-sm cursor-pointer"
          >
            SIGN IN
          </Button>
          <Button
            onClick={() => navigate("/register")}
            className="bg-blue-600 hover:bg-blue-500 text-white font-lato font-bold tracking-widest text-xs md:text-sm border border-black/35 rounded-lg px-4 py-2 shadow-md shadow-blue-600/10 cursor-pointer active:scale-95 transition-all"
          >
            SIGN UP
          </Button>
        </div>
      </header>

      

      {/* Auth Modal Overlay */}
      {showAuth && (
        <Modal isOpen={true} onClose={() => navigate("/")}>
          {showAuth === "login" ? (
            <Signin />
          ) : showAuth === "register" ? (
            <Signup />
          ) : (
            <ForgotPassword />
          )}
        </Modal>
      )}
    </div>
  );
};

export default LandingPage;
