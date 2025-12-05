import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { FileText, Image, Upload, Mail } from "lucide-react";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const signInSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(255),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      
      const validation = signInSchema.safeParse({ email, password });
      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    try {
      setLoading(true);
      
      const validation = signUpSchema.safeParse({ name, email, password, confirmPassword });
      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;

      // Create profile with name
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({ user_id: data.user.id, name });

        if (profileError) throw profileError;
      }
      
      toast({
        title: "Success!",
        description: "Account created. You can now sign in.",
      });

      // Reset form
      setName("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async () => {
    try {
      setLoading(true);
      
      const emailValidation = z.string().email("Invalid email address").safeParse(otpEmail);
      if (!emailValidation.success) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (error) throw error;
      
      setOtpSent(true);
      toast({
        title: "Magic Link Sent!",
        description: "Check your email for the login link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-accent/10 p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6 text-center md:text-left">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              FileVault Pro
            </h1>
            <p className="text-lg text-muted-foreground">
              Store, organize, and manage all your files and notes in one secure place
            </p>
          </div>
          
          <div className="flex gap-4 justify-center md:justify-start">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 border border-border">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Notes</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 border border-border">
              <Image className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium">Images</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 border border-border">
              <Upload className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Documents</span>
            </div>
          </div>
        </div>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="otp">
                  <Mail className="h-4 w-4 mr-1" />
                  OTP
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSignIn}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Min 8 chars, uppercase, lowercase, number & special character
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSignUp}
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </TabsContent>

              <TabsContent value="otp" className="space-y-4">
                {!otpSent ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp-email">Email</Label>
                      <Input
                        id="otp-email"
                        type="email"
                        placeholder="you@example.com"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      We'll send a magic link to your email for passwordless sign-in.
                    </p>
                    <Button
                      className="w-full"
                      onClick={handleOtpLogin}
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send Magic Link"}
                    </Button>
                  </>
                ) : (
                  <div className="text-center space-y-4 py-4">
                    <Mail className="h-12 w-12 mx-auto text-primary" />
                    <div>
                      <h3 className="font-semibold">Check your email</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We sent a magic link to <strong>{otpEmail}</strong>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpEmail("");
                      }}
                    >
                      Try another email
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
