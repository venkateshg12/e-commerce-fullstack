import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForgotPassword } from "@/hooks/auth/useForgotPassword";
import { AlertPopup } from "@/components/ui/alert-popup";
import { LoadingDots } from "@/constants/constant";
import type { AlertType } from "@/lib/types";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [popup, setPopup] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    description: string;
    onAction?: () => void;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    description: "",
  });

  const { mutate: sendResetEmail, isPending } = useForgotPassword();

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    sendResetEmail(email.trim(), {
      onSuccess: (response) => {
        setPopup({
          isOpen: true,
          type: "success",
          title: "Email Sent",
          description: response?.data?.message || "Password reset link sent to your email.",
          onAction: () => {
            navigate("/login");
          },
        });
      },
      onError: (error: any) => {
        const errorMsg = error?.errors?.[0]?.message || "Something went wrong. Please try again.";
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error Occurred",
          description: errorMsg,
        });
      },
    });
  };

  return (
    <div className="flex justify-center mx-4 items-center mt-16 md:mt-0 md:h-screen">
      <Card className="max-w-sm w-full rounded-md ring ring-black/30 shadow-xl">
        <CardHeader>
          <CardTitle className="text-center font-semibold font-ubuntuMono tracking-wide">
            Forgot Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid flex-col gap-6">
              <div className="grid gap-1">
                <Label
                  htmlFor="email"
                  className="font-ubuntuMono font-semibold tracking-widest text-sm md:text-md"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  type="email"
                  placeholder="Enter your email"
                  className="bg-gray-100"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2 mt-6">
              <Button
                type="submit"
                disabled={isPending}
                className="relative text-white my-2 bg-blue-500 cursor-pointer hover:bg-blue-600 border border-black/40 rounded-md font-ubuntuMono font-bold tracking-widest"
              >
                {isPending ? <LoadingDots /> : "Reset Password"}
              </Button>
            </div>
            <div className="flex justify-center mt-4 font-ubuntuMono tracking-wide">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-block font-ubuntuMono font-bold tracking-widest text-sm underline underline-offset-4 hover:no-underline bg-transparent border-none cursor-pointer p-0 text-black"
              >
                Back to Login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
      <AlertPopup
        isOpen={popup.isOpen}
        type={popup.type}
        title={popup.title}
        description={popup.description}
        onClose={() => {
          setPopup((prev) => ({ ...prev, isOpen: false }));
          if (popup.type === "success") {
            navigate("/login");
          }
        }}
      />
    </div>
  );
};

export default ForgotPassword;
