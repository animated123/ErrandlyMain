import { getApp } from "../server";

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Serverless Handler Error]:", err);
    return res.status(500).json({
      error: err?.message || "Internal Server Error in Vercel API Handler",
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
  }
}
