import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useResetPassword } from "@/hooks/auth/useResetPassword";
import { LoadingDots } from "@/constants/constant";

export default function ResetPassword() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const { mutate: reset, isPending, isSuccess, isError, error, data } = useResetPassword();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setValidationError(null);

        if (!password || !confirmPassword) {
            setValidationError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setValidationError("Passwords do not match.");
            return;
        }

        if (!token) {
            setValidationError("Reset token is missing.");
            return;
        }

        reset({ token, password, confirmPassword }, {
            onSuccess: () => {
                setTimeout(() => {
                    navigate("/login", { replace: true });
                }, 2000);
            }
        });
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#f9fafb] overflow-hidden font-sans">
            <div className="absolute inset-0 pointer-events-none opacity-[0.2]" />
            <Card className="relative w-full max-w-110 border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-3xl bg-white p-6 md:p-9 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                <CardContent className="p-0 flex flex-col items-center text-center">

                    {isSuccess ? (
                        <>
                            <div className="relative mb-5">
                                <div className="absolute inset-0 -m-5 rounded-full opacity-20 bg-emerald-100 animate-pulse" />
                                <div className="absolute inset-0 -m-2.5 rounded-full opacity-40 bg-emerald-50" />
                                <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-md bg-emerald-600 shadow-emerald-100">
                                    <CheckCircle2 className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <div className="space-y-1.5 mb-6">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Password Reset Successful
                                </h1>
                                <p className="text-slate-500 text-[13px] leading-relaxed max-w-[90%] mx-auto font-medium">
                                    {data?.data?.message || "Your password has been successfully reset! Redirecting to login..."}
                                </p>
                            </div>
                            <div className="py-2 mb-4">
                                <LoadingDots />
                            </div>
                            <Button
                                onClick={() => navigate("/login", { replace: true })}
                                className="w-full h-10.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all"
                            >
                                Go to Login
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="relative mb-5">
                                <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-md bg-indigo-600 shadow-indigo-100">
                                    <Lock className="w-7 h-7 text-white" />
                                </div>
                            </div>

                            <div className="space-y-1.5 mb-3">
                                <h1 className="text-xl font-bold tracking-wide text-slate-900 font-ubuntuMono">
                                    Reset Password
                                </h1>
                                <p className="text-slate-500 text-[13px] leading-relaxed max-w-[90%] mx-auto font-medium">
                                    Please enter your new password below.
                                </p>
                            </div>

                            {(validationError || isError) && (
                                <div className="w-full p-3.5 rounded-xl text-xs  font-semibold mb-4 text-center border bg-rose-50 border-rose-100 text-rose-700">
                                    <p className="mt-1 font-medium">
                                        {validationError || error?.errors?.[0]?.message || "Something went wrong. Please try again."}
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
                                <div className="space-y-1">
                                    <Label htmlFor="password" className="font-ubuntuMono font-semibold tracking-widest text-xs md:text-sm text-slate-700">
                                        New Password
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter new password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="h-10.5 pr-10 bg-slate-50 border-slate-300 rounded-lg focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all text-sm font-medium text-black"
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent hover:bg-transparent hover:shadow-none shadow-none cursor-pointer text-slate-500"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="confirmPassword" className="font-ubuntuMono font-semibold tracking-widest text-xs md:text-sm text-slate-700">
                                        Confirm Password
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="h-10.5 pr-10 bg-slate-50 border-slate-300 rounded-lg focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all text-sm font-medium text-black"
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-transparent hover:bg-transparent hover:shadow-none shadow-none cursor-pointer text-slate-500"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full h-10.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer"
                                >
                                    {isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Reset Password"
                                    )}
                                </Button>
                            </form>

                            <div className="w-full mt-6 space-y-4">
                                <Separator className="w-full bg-slate-100" />
                                <Button
                                    variant="ghost"
                                    className="w-full h-10.5 rounded-lg border cursor-pointer border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold flex items-center justify-center gap-2 text-[13px] transition-all"
                                    onClick={() => navigate("/login")}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Button>
                            </div>
                        </>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
