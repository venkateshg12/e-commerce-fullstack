import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AlertType } from "@/lib/types";
import { useRegister } from "@/hooks/auth/useRegister";
import { AlertPopup } from "@/components/ui/alert-popup";
import { LoadingDots } from "@/constants/constant";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";


const Signup = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
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

    const { mutate: register, isPending } = useRegister();

    const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        register(
            {
                name, email, password, confirmPassword
            }, {
            onSuccess: (response) => {
                console.log(response);
                
                console.log(response.data.title);
                
                setPopup({
                    isOpen: true,
                    type: "info",
                    title: response?.data?.title || "Registration Successfull",
                    description: response?.data?.message ||  "check the email"
                })
            },
            onError: (error) => {
                setPopup({
                    isOpen: true,
                    type: "error",
                    title: "Error Occured",
                    description: error.errors[0].message || "Please try again after some time"
                })
            }
        }
        )

    }



    return (
        <div className="flex justify-center mx-4 items-center mt-10 md:mt-0 md:h-screen">
            <Card className=" max-w-sm w-full  rounded-md ring ring-black/30 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-center font-semibold font-ubuntuMono  tracking-wide">Create your account</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid flex-col gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="text-spacing" className=" font-ubuntuMono font-semibold tracking-widest text-sm md:text-md">Name</Label>
                                <Input
                                    onChange={(e) => setName(e.target.value)}
                                    value={name}
                                    type="text"
                                    placeholder="Enter your name"
                                    className="bg-gray-100"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="email-spacing" className=" font-ubuntuMono font-semibold tracking-widest text-sm md:text-md">Email</Label>
                                <Input
                                    onChange={(e) => setEmail(e.target.value)}
                                    value={email}
                                    type="email"
                                    placeholder="Enter your mail"
                                    className="bg-gray-100"
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
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="password-spacing" className=" font-ubuntuMono font-semibold tracking-widest text-sm md:text-md">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        value={confirmPassword}
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password again"
                                        className="pr-10 bg-gray-100"
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
                            </div>
                        </div>
                        <div className="grid gap-2 mt-5">
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="relative text-white  bg-blue-500 cursor-pointer hover:bg-blue-600 border border-black/40 rounded-md font-ubuntuMono font-bold tracking-widest">
                                {isPending ? <LoadingDots/> : 'Register'}
                            </Button>
                             <GoogleSignInButton />
                        </div>
                        <div className="flex justify-center mt-3 font-ubuntuMono tracking-wide">
                            <p>Already have an account ?  &nbsp;</p>
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="inline-block font-ubuntuMono font-bold tracking-widest text-sm underline underline-offset-4 hover:no-underline bg-transparent border-none cursor-pointer p-0 text-black"
                            >
                                signin
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
        </div>
    )
}

export default Signup;
