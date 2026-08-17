import { getApp } from "../server";

export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel functions
  if (res && typeof res.setHeader === "function") {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-session-id, x-connectionadmin-password"
    );
  }

  if (req.method === "OPTIONS") {
    if (res && typeof res.status === "function") {
      return res.status(200).end();
    }
    return;
  }

  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Serverless Handler Error]:", err);
    if (res && typeof res.status === "function") {
      return res.status(500).json({
        success: false,
        error: "Serverless Function Invocation Error: " + (err?.message || String(err)),
        stack: process.env.NODE_ENV === "development" ? err?.stack : undefined
      });
    }
    throw err;
  }
}
