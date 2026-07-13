import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/hooks/auth/useLogin";
import { AlertPopup } from "@/components/ui/alert-popup";
import { LoadingDots } from "@/constants/constant";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import type { AlertType } from "@/lib/types";


const Signin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [popup, setPopup] = useState<{
    isOpen: boolean,
    type: AlertType,
    title: string,
    description: string,
    onAction?: () => void;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    description: ""
  })


  const { mutate: signIn, isPending } = useLogin();

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    signIn({
      email,
      password,
    }, {
      onError: (error: any) => {
        setPopup({
          isOpen: true,
          type: "error",
          title: "Error Occurred",
          description:
            error.errors[0].message || "Invalid credentials. Please try again.",
        });
      },
    }
    );
  }






  return (
    <div className="flex justify-center mx-4 items-center mt-16 md:mt-0 md:h-screen">
      <Card className=" max-w-sm w-full  rounded-md ring ring-black/30 shadow-xl">
        <CardHeader>
          <CardTitle className="text-center font-semibold font-ubuntuMono tracking-wide">Login to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid flex-col gap-7">
              <div className="grid gap-1">
                <Label htmlFor="email-spacing" className=" font-ubuntuMono font-semibold tracking-widest text-sm md:text-md">Email</Label>
                <Input
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  type="email"
                  placeholder="Enter your mail"
                  className="bg-gray-100"
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="password-spacing" className=" font-ubuntuMono font-semibold tracking-widest text-sm md:text-md">Password</Label>
                <div className="relative">
                  <Input
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pr-10 bg-gray-100"
                    required
                  />
                  <Button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 bg-transparent hover:bg-transparent hover:shadow-none cursor-pointer active:scale-100"
                  >
                    {showPassword ?
                      (<EyeOff className="text-gray-700" />)
                      :
                      (<Eye className="text-gray-700" />)
                    }
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/password/forgot")}
                  className="ml-auto inline-block font-ubuntuMono font-bold tracking-widest text-sm underline-offset-4 hover:underline bg-transparent border-none cursor-pointer p-0 text-black"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Button
                type="submit"
                disabled={isPending}
                className="relative text-white my-5  bg-blue-500 cursor-pointer hover:bg-blue-600 border border-black/40 rounded-md font-ubuntuMono font-bold tracking-widest">
                {isPending ? <LoadingDots /> : 'login'}
              </Button>
              <div className="flex items-center gap-1 justify-center -mt-3 mb-3">
                <div className="h-px flex-1 bg-gray-500" />
                <span className="text-sm text-black">Or</span>
                <div className="h-px flex-1 bg-gray-500" />
              </div>
              <GoogleSignInButton />
            </div>
            <div className="flex justify-center mt-3 font-ubuntuMono tracking-wide">
              <p>Don't have an account ?  &nbsp;</p>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="inline-block font-ubuntuMono font-bold tracking-widest text-sm underline underline-offset-4 hover:no-underline bg-transparent border-none cursor-pointer p-0 text-black"
              >
                signup
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
        onClose={() => setPopup((prev) => ({ ...prev, isOpen: false }))}
        onAction={popup.onAction}
      />
    </div >
  )
}

export default Signin;
