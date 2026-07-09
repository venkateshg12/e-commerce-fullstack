import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";


const Signup = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");





    return (
        <div className="flex justify-center mx-4 items-center mt-10 md:mt-0 md:h-screen">
            <Card className=" max-w-sm w-full  rounded-md ring ring-black/30 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-center font-semibold font-ubuntuMono  tracking-wide">Create your account</CardTitle>
                </CardHeader>
                <CardContent>
                    <form>
                        <div className="grid flex-col gap-3">
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
                            className="relative text-white  bg-blue-500 cursor-pointer hover:bg-blue-600 border border-black/40 rounded-md font-ubuntuMono font-bold tracking-widest">
                                Register
                            </Button>
                            <Button className="relative text-black bg-transparent cursor-pointer hover:bg-transparent border border-black/40 rounded-md font-ubuntuMono font-bold tracking-widest">
                                <FcGoogle className="h-5 w-5" />
                                Signup with Google
                            </Button>
                        </div>
                        <div className="flex justify-center mt-3 font-ubuntuMono tracking-wide">
                            <p>Already have an account ?  &nbsp;</p>
                            <a
                                href="#"
                                className="inline-block font-ubuntuMono font-bold tracking-widest text-sm underline-offset-4 hover:underline"
                            >
                                signin
                            </a>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default Signup;
