"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function AdminLoginPage() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!isLoading && user && profile?.role === "admin") {
      // Admin is already logged in, redirect directly to admin dashboard
      router.push("/admin/dashboard");
    } else if (!isLoading && user && profile?.role !== "admin") {
      // Non-admin user, redirect to regular dashboard
      router.push("/overview");
    }
  }, [user, profile, isLoading, router]);



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError("");

    try {
      console.log("Admin login attempt for:", loginForm.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        console.error("Login error:", error);
        setError("Invalid admin credentials");
        return;
      }

      console.log("Login successful, checking session...");
      
      // Wait a moment for session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get fresh session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        setError("Failed to establish session");
        return;
      }
      
      console.log("Session established, access token length:", session.access_token?.length);

      // Check if user is an admin
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        setError("Failed to fetch user profile");
        return;
      }

      if (userProfile?.role !== "admin") {
        console.log("User is not admin, role:", userProfile?.role);
        await supabase.auth.signOut();
        setError("Access denied. Admin privileges required.");
        return;
      }

      console.log("Admin login successful, redirecting...");
      setToast({ message: "Admin login successful", type: "success" });
      
      // Small delay to ensure session is fully established
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 100);
      
    } catch (error) {
      console.error("Login exception:", error);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };



  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoginForm({ email: "", password: "" });
    setError("");
    setToast(null);
    // Stay on admin login page
  };

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Shield className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access the admin dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Admin Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="admin@platform.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? "Signing in..." : "Sign in as Admin"}
                </button>
              </div>
            </form>

        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
          <div
            className={`rounded-md p-4 shadow-lg ${
              toast.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {toast.type === "success" ? (
                  <CheckCircle
                    className="h-5 w-5 text-green-400"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="h-5 w-5 text-red-400"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="ml-3">
                <p
                  className={`text-sm font-medium ${
                    toast.type === "success" ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {toast.message}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    onClick={() => setToast(null)}
                    className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      toast.type === "success"
                        ? "text-green-500 hover:bg-green-100 focus:ring-offset-green-50 focus:ring-green-600"
                        : "text-red-500 hover:bg-red-100 focus:ring-offset-red-50 focus:ring-red-600"
                    }`}
                  >
                    <span className="sr-only">Dismiss</span>×
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
