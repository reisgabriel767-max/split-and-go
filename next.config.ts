import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  devIndicators: false,
};

export default config;
