import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { verifyEmail, resendVerificationEmail } from "@/api/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, X, Lightbulb, Mail, SendHorizontal, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useMountEffect } from "@/hooks/useMountEffect";
import { cn } from "@/lib/utils";
import { LoadingDots } from "@/constants/constant";
import type { FailureResponse, SuccessResponse, VerifiedResponse } from "@/lib/types";


export default function VerifyEmail() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");

    const { mutate: verify, isPending, isSuccess, isError, error, data } = useMutation<SuccessResponse<VerifiedResponse>, FailureResponse, string>({
        mutationFn: verifyEmail,
        onSuccess: () => {
            setTimeout(() => {
                navigate("/home", { replace: true });
            }, 2000);
        },
    });

    useMountEffect(() => {
        if (token) {
            verify(token);
        }
    });

    const {
        mutate: resend,
        isPending: isResending,
        isSuccess: resendSuccess,
        isError: resendError,
        error: resendFailure,
        data: resendData,
    } = useMutation<SuccessResponse<VerifiedResponse>, FailureResponse, string>({
        mutationFn: resendVerificationEmail,
    });

    const handleResend = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (email.trim()) {
            resend(email.trim());
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#f9fafb] overflow-hidden font-sans">
            <div className="absolute inset-0 pointer-events-none opacity-[0.2]" />
            <Card className="relative w-full max-w-110 border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] rounded-3xl bg-white p-6 md:p-9 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                <CardContent className="p-0 flex flex-col items-center text-center">

                    {/* 1. Loading/Pending State inside Card */}
                    {isPending && (
                        <>
                            <div className="relative mb-5">
                                <div className="absolute inset-0 -m-5 rounded-full opacity-20 bg-indigo-100 animate-pulse" />
                                <div className="absolute inset-0 -m-2.5 rounded-full opacity-40 bg-indigo-50" />
                                <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-md bg-indigo-600 shadow-indigo-100">
                                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-1.5 mb-6">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Verifying Email
                                </h1>
                                <p className="text-slate-500 text-[13px] leading-relaxed max-w-[90%] mx-auto font-medium">
                                    Please wait while we confirm your email address.
                                </p>
                            </div>
                            <div className="py-2 mb-4">
                                <LoadingDots />
                            </div>
                        </>
                    )}

                    {/* 2. Success State inside Card */}
                    {isSuccess && (
                        <>
                            <div className="relative mb-5">
                                <div className="absolute inset-0 -m-5 rounded-full opacity-20 bg-emerald-100" />
                                <div className="absolute inset-0 -m-2.5 rounded-full opacity-40 bg-emerald-50" />
                                <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-md bg-emerald-600 shadow-emerald-100">
                                    <CheckCircle2 className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <div className="space-y-1.5 mb-6">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Account Verified
                                </h1>
                                <p className="text-slate-500 text-[13px] leading-relaxed max-w-[90%] mx-auto font-medium">
                                    {data?.data?.message || "Your email has been successfully verified! Redirecting..."}
                                </p>
                            </div>
                        </>
                    )}

                    {/* 3. Error/Expired State inside Card */}
                    {isError && (
                        <>
                            <div className="relative mb-3">
                                <div className="absolute inset-0 -m-5 rounded-full transition-colors duration-500 opacity-20 bg-rose-100" />
                                <div className="absolute inset-0 -m-2.5 rounded-full transition-colors duration-500 opacity-40 bg-rose-50" />
                                <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-md transition-all duration-500 bg-rose-500 shadow-rose-100">
                                    <X className="w-7 h-7 text-white stroke-[3px]" />
                                </div>
                            </div>

                            <div className="space-y-1.5 mb-3">
                                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                    Verification Link Expired
                                </h1>
                                <p className="text-slate-500 text-[13px] leading-relaxed max-w-[90%] mx-auto font-medium">
                                    {error?.errors?.[0]?.message || "This verification link is no longer valid. It may have expired or has already been used."}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/50 border border-amber-100/50 text-left mb-6">
                                <div className="shrink-0 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-xs">
                                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
                                </div>
                                <p className="text-amber-800 text-[12px] leading-tight font-medium">
                                    Don't worry! Enter your email below to get a new activation link.
                                </p>
                            </div>

                            {/* Resend Status Inline Message Box */}
                            {(isResending || resendSuccess || resendError) && (
                                <div
                                    className={cn(
                                        "w-full p-3.5 rounded-xl text-xs font-semibold mb-6 text-left border transition-all duration-300",
                                        isResending &&
                                            "bg-blue-50 border-blue-100 text-blue-700",
                                        resendSuccess &&
                                            "bg-emerald-50 border-emerald-100 text-emerald-700",
                                        resendError &&
                                            "bg-rose-50 border-rose-100 text-rose-700"
                                    )}
                                >
                                    {isResending ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                            Sending verification email...
                                        </span>
                                    ) : resendSuccess ? (
                                        <>
                                            <p className="font-bold">
                                                 Email Sent
                                            </p>
                                            <p className="mt-1 font-medium">
                                                {resendData?.data?.message || "A new verification link has been sent to your inbox."}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-bold">Failed to Resend</p>
                                            <p className="mt-1 font-medium">
                                                {resendFailure?.errors?.[0]?.message || "Something went wrong. Please try again."}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="w-full space-y-6">
                                <div className="relative flex items-center justify-center">
                                    <Separator className="w-full bg-slate-100" />
                                    <span className="absolute px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Resend Verification Email
                                    </span>
                                </div>

                                <form onSubmit={handleResend} className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="relative group">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                            <Input
                                                type="email"
                                                placeholder="Enter your registered email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="h-10.5 pl-10 pr-4 bg-slate-50 border-slate-500 rounded-lg focus:bg-white focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 transition-all text-sm font-medium text-black"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={isResending}
                                            className="w-full h-10.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm shadow-indigo-100 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                                        >
                                            {isResending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <SendHorizontal className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    Send New Link
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}

                    {/* Footer Navigation (Always Visible) */}
                    <div className="w-full mt-3 space-y-5">
                        <div className="relative flex items-center justify-center">
                            <Separator className="w-full bg-slate-100" />
                            <div className="absolute px-2.5 py-0.5 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-bold text-slate-400 uppercase shadow-xs">
                                or
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full h-10.5 rounded-lg border cursor-pointer hover:scale-[1.05] border-slate-500 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold flex items-center justify-center gap-2 text-[13px] transition-all"
                            onClick={() => navigate("/login")}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Login
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}