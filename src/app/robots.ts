import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/decisions",
          "/documents",
          "/meetings",
          "/actions",
          "/proposals",
          "/topics",
          "/members",
          "/settings",
          "/glade",
          "/new-space",
          "/api/",
          "/shared/",
        ],
      },
    ],
    sitemap: "https://ourglade.app/sitemap.xml",
  };
}
