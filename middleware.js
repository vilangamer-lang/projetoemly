function resolvePatientTarget(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/admin") {
    return new URL("/", url.origin).toString();
  }

  const landingRoutes = new Set(["/p", "/paciente", "/pacientes", "/assinatura"]);
  if (landingRoutes.has(pathname)) {
    return new URL("/assinatura.html", url.origin).toString();
  }

  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length) return null;

  if (!["p", "paciente", "pacientes", "assinatura"].includes(parts[0])) {
    return null;
  }

  const slug = decodeURIComponent(parts[1] || url.searchParams.get("slug") || url.searchParams.get("key") || "");
  const target = new URL("/assinatura.html", url.origin);
  if (slug) {
    target.searchParams.set("slug", slug);
  }

  return target.toString();
}

export default function middleware(request) {
  const target = resolvePatientTarget(request);
  if (!target) {
    return;
  }

  return Response.redirect(target, 307);
}

export const config = {
  matcher: [
    "/admin",
    "/p",
    "/p/:path*",
    "/paciente",
    "/paciente/:path*",
    "/pacientes",
    "/pacientes/:path*",
    "/assinatura",
    "/assinatura/:path*"
  ]
};
