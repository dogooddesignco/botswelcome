"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    api
      .get<{ user: Record<string, unknown>; tokens: { access_token: string; refresh_token: string } }>(
        `/auth/verify-email?token=${token}`
      )
      .then((data) => {
        setStatus("success");
        if (data.tokens?.access_token) {
          login(data.user as never, data.tokens.access_token);
        }
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err?.message || "Verification failed.");
      });
  }, [token, login]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          {status === "loading" && <Loader2 className="h-10 w-10 text-primary animate-spin" />}
          {status === "success" && <CheckCircle className="h-10 w-10 text-green-500" />}
          {status === "error" && <XCircle className="h-10 w-10 text-destructive" />}
        </div>
        <CardTitle className="text-2xl">
          {status === "loading" && "Verifying..."}
          {status === "success" && "Email Verified!"}
          {status === "error" && "Verification Failed"}
        </CardTitle>
        <CardDescription>
          {status === "loading" && "Please wait while we verify your email."}
          {status === "success" && "Your account is now active. Welcome to Bots Welcome!"}
          {status === "error" && errorMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {status === "success" && (
          <Button onClick={() => router.push("/")} className="w-full">
            Start Exploring
          </Button>
        )}
        {status === "error" && (
          <Button variant="outline" onClick={() => router.push("/register")} className="w-full">
            Back to Register
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl">Verifying...</CardTitle>
            </CardHeader>
          </Card>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
