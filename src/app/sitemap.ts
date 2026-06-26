import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://b1overs.com",
      lastModified: new Date(),
    },
  ];
}