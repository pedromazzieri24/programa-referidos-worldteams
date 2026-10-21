import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El CV puede pesar hasta 5 MB (lo limita también el bucket); el resto es margen para los campos del formulario.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
