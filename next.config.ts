import type { NextConfig } from "next";
import { hostname, networkInterfaces } from "node:os";

function getAllowedDevOrigins() {
  const origins = new Set(["localhost", "127.0.0.1", "*.local", "*.lan"]);
  origins.add(hostname());

  Object.values(networkInterfaces())
    .flat()
    .forEach((network) => {
      if (
        network &&
        !network.internal &&
        network.family === "IPv4"
      ) {
        origins.add(network.address);
      }
    });

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins:
    process.env.NODE_ENV === "development"
      ? getAllowedDevOrigins()
      : undefined,
  experimental: {
    proxyClientMaxBodySize: "30mb",
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
