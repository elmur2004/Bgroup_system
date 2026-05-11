import type { NextConfig } from "next";

/**
 * Legacy-path redirects.
 *
 * The HR + CRM apps were originally standalone, so old code occasionally still
 * pushes to root-level paths like `/employees/<id>` even though everything
 * now lives under `/hr/*` and `/crm/*`. These rules are a safety net so any
 * stale link redirects to the correct namespaced page instead of 404'ing.
 *
 * Source links are also being fixed in-place; this layer just prevents future
 * regressions from leaking 404s to users.
 */
const HR_PREFIXES = [
  "employees",
  "employee", // self-service routes like /employee/profile
  "attendance",
  "leaves",
  "overtime",
  "incidents",
  "bonuses",
  "payroll",
  "departments",
  "leave-balance",
  "team",
  "accountant",
  "management",
  "calendar",
  "org-chart",
];

const CRM_PREFIXES = ["opportunities", "calls", "contacts", "products"];

const nextConfig: NextConfig = {
  async redirects() {
    const hrRedirects = HR_PREFIXES.flatMap((p) => [
      { source: `/${p}`, destination: `/hr/${p}`, permanent: false },
      { source: `/${p}/:path*`, destination: `/hr/${p}/:path*`, permanent: false },
    ]);
    const crmRedirects = CRM_PREFIXES.flatMap((p) => [
      { source: `/${p}`, destination: `/crm/${p}`, permanent: false },
      { source: `/${p}/:path*`, destination: `/crm/${p}/:path*`, permanent: false },
    ]);
    return [
      ...hrRedirects,
      ...crmRedirects,
      // `/companies` is ambiguous (HR + CRM both have it). Default to CRM —
      // HR users go to /hr/companies via the sidebar directly.
      { source: "/companies", destination: "/crm/companies", permanent: false },
      { source: "/companies/:path*", destination: "/crm/companies/:path*", permanent: false },
      // `/dashboard` defaults to HR.
      { source: "/dashboard", destination: "/hr/dashboard", permanent: false },
      // Settings/Reports historically were HR-only at root.
      { source: "/settings/:path*", destination: "/hr/settings/:path*", permanent: false },
      { source: "/reports/:path*", destination: "/hr/reports/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
