import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getAuthContext, createAuthError } from "@/utils/auth";

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext(request);

    if (!authContext) {
      return NextResponse.json(createAuthError("Authentication required"), {
        status: 401,
      });
    }

    // Only admins can access this endpoint
    if (authContext.profile.role !== "admin") {
      return NextResponse.json(createAuthError("Admin access required"), {
        status: 403,
      });
    }

    // Use appropriate supabase client based on auth method
    let supabase
    const authHeader = request.headers.get("authorization")
    
    if (authHeader?.startsWith("Bearer ")) {
      // For Bearer token auth, use anon client with the token
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: authHeader
            }
          }
        }
      )
    } else {
      // Use the standard server client for cookie-based auth
      supabase = await createServerSupabaseClient()
    }

    // Get counts for existing tables only
    const [organizationsResult, usersResult] = await Promise.all([
      supabase.from("tenants").select("id", { count: "exact" }),
      supabase
        .from("profiles")
        .select("id", { count: "exact" })
        .neq("role", "admin"),
    ]);

    // Try to get other counts, but handle errors gracefully
    let sitesResult = { count: 0 };
    let sensorsResult = { count: 0 };
    let alertsResult = { count: 0 };

    try {
      sitesResult = await supabase
        .from("sites")
        .select("id", { count: "exact" });
    } catch (e) {
      console.log("Sites table not available yet");
    }

    try {
      sensorsResult = await supabase
        .from("sensors")
        .select("id", { count: "exact" });
    } catch (e) {
      console.log("Sensors table not available yet");
    }

    try {
      alertsResult = await supabase
        .from("alerts")
        .select("id", { count: "exact" })
        .eq("status", "active");
    } catch (e) {
      console.log("Alerts table not available yet");
    }

    // Get organization health data
    const { data: organizations } = await supabase
      .from("tenants")
      .select(
        `
        id,
        name,
        slug,
        plan,
        status,
        max_users,
        created_at
      `
      )
      .order("created_at", { ascending: false })
      .limit(10);

    // Get user counts per organization (safely)
    const orgHealthData = await Promise.all(
      (organizations || []).map(async (org) => {
        const { count: userCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("tenant_id", org.id)
          .neq("role", "admin");

        let siteCount = 0;
        let activeAlerts = 0;

        try {
          const siteResult = await supabase
            .from("sites")
            .select("id", { count: "exact" })
            .eq("tenant_id", org.id);
          siteCount = siteResult.count || 0;
        } catch (e) {
          // Sites table doesn't exist yet
        }

        try {
          const alertResult = await supabase
            .from("alerts")
            .select("id", { count: "exact" })
            .eq("tenant_id", org.id)
            .eq("status", "active");
          activeAlerts = alertResult.count || 0;
        } catch (e) {
          // Alerts table doesn't exist yet
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          status: org.status,
          current_users: userCount || 0,
          max_users: org.max_users,
          total_sites: siteCount,
          active_alerts: activeAlerts,
          user_utilization:
            org.max_users > 0
              ? Math.round(((userCount || 0) / org.max_users) * 100)
              : 0,
          created_at: org.created_at,
        };
      })
    );

    // Get recent admin activity (safely)
    let recentActivity = [];
    try {
      const activityResult = await supabase
        .from("admin_activity")
        .select(
          `
          id,
          action,
          resource_type,
          resource_name,
          created_at,
          admin_id
        `
        )
        .order("created_at", { ascending: false })
        .limit(10);
      recentActivity = activityResult.data || [];
    } catch (e) {
      console.log("Admin activity table not available yet");
    }

    // Calculate system health metrics
    const totalOrgs = organizationsResult.count || 0;
    const totalUsers = usersResult.count || 0;
    const totalSites = sitesResult?.count || 0;
    const totalSensors = sensorsResult?.count || 0;
    const activeAlerts = alertsResult?.count || 0;

    // Plan distribution
    const planDistribution = orgHealthData.reduce((acc, org) => {
      acc[org.plan] = (acc[org.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      stats: {
        total_organizations: totalOrgs,
        total_users: totalUsers,
        total_sites: totalSites,
        total_sensors: totalSensors,
        active_alerts: activeAlerts,
      },
      organization_health: orgHealthData,
      recent_activity: recentActivity,
      plan_distribution: planDistribution,
      system_metrics: {
        avg_users_per_org:
          totalOrgs > 0 ? Math.round(totalUsers / totalOrgs) : 0,
        avg_sites_per_org:
          totalOrgs > 0 ? Math.round(totalSites / totalOrgs) : 0,
        avg_sensors_per_site:
          totalSites > 0 ? Math.round(totalSensors / totalSites) : 0,
        alert_rate:
          totalSensors > 0
            ? Math.round((activeAlerts / totalSensors) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Admin stats API error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          requestId: crypto.randomUUID(),
        },
      },
      { status: 500 }
    );
  }
}
