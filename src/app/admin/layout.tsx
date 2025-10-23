"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import OrganizationSelector from "@/components/admin/OrganizationSelector";
import GlobalSearch from "@/components/admin/GlobalSearch";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isLoading, isInitialized, signOutWithRedirect } =
    useAuthStore();

  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (!user || !profile) {
        // Not authenticated, redirect to admin login
        router.push("/admin-login");
      } else if (profile.role !== "admin") {
        // Not an admin, redirect to appropriate dashboard
        console.log("User role:", profile.role, "redirecting to overview");
        router.push("/overview");
      }
    }
  }, [user, profile, isLoading, isInitialized, router]);

  // Show loading while checking auth
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Admin Portal
          </h2>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if not admin
  if (!user || !profile || profile.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access the admin portal.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Current role: {profile?.role || "none"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Admin Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-sm text-gray-600 mt-1">Relationship Manager</p>
          </div>

          <nav className="mt-6">
            <div className="px-3">
              <div className="space-y-1">
                <Link
                  href="/admin/dashboard"
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === "/admin/dashboard"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/organizations"
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname.startsWith("/admin/organizations")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Organizations
                </Link>
                <Link
                  href="/admin/environments"
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname.startsWith("/admin/environments")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Environments
                </Link>
                <Link
                  href="/admin/sites"
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname.startsWith("/admin/sites")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Sites & Sensors
                </Link>

                <Link
                  href="/admin/users"
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname.startsWith("/admin/users")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  User Management
                </Link>
                <Link
                  href="/admin/system"
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === "/admin/system"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  System Health
                </Link>
                <Link
                  href="/admin/layout-viewer"
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === "/admin/layout-viewer"
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Layout
                </Link>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Welcome, {profile.full_name || profile.email}
                </h2>
                <OrganizationSelector />
              </div>
              <div className="flex items-center space-x-4">
                <GlobalSearch />
                <button
                  onClick={() => signOutWithRedirect(router)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
