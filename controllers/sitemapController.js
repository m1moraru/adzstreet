import pool from "../config/db.js";

export async function getSitemap(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        public_id,
        title,
        updated_at,
        created_at
      FROM ads
      WHERE is_active = true
        AND is_published = true
        AND is_sold = false
      ORDER BY updated_at DESC NULLS LAST
    `);

    const urls = result.rows
      .map((ad) => {
        const lastmod = (
          ad.updated_at ||
          ad.created_at ||
          new Date()
        ).toISOString();

        return `
  <url>
    <loc>https://adzstreet.com/ads/${ad.public_id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Sitemap error:", err);

    res.status(500).send("Failed to generate sitemap");
  }
}