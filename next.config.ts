import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/mentor/dashboard", permanent: false },
      { source: "/agenda", destination: "/mentor/agenda", permanent: false },
      { source: "/mentorados", destination: "/mentor/mentorados", permanent: false },
      { source: "/mentorados/:path*", destination: "/mentor/mentorados/:path*", permanent: false },
      { source: "/modulos", destination: "/mentor/modulos", permanent: false },
      { source: "/modulos/:path*", destination: "/mentor/modulos/:path*", permanent: false },
      { source: "/simulados", destination: "/mentor/simulados", permanent: false },
      { source: "/financeiro", destination: "/mentor/financeiro", permanent: false },
      { source: "/relatorios", destination: "/mentor/relatorios", permanent: false },
      { source: "/usuarios", destination: "/mentor/usuarios", permanent: false },
      { source: "/conta", destination: "/mentor/conta", permanent: false },
    ];
  },
};

export default nextConfig;
