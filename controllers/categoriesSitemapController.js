import pool from "../config/db.js";

function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getCategoriesSitemap(req, res) {
  try {
    const result = await pool.query(`
      SELECT DISTINCT
        category,
        city,
        updated_at
      FROM ads
      WHERE is_active = true
        AND is_published = true
        AND is_sold = false
        AND category IS NOT NULL
        AND city IS NOT NULL
      ORDER BY category, city
    `);

    const urls = [];

    const categories = [
      ...new Set(result.rows.map((r) => r.category)),
    ];

    // Category pages
    categories.forEach((category) => {
      urls.push(`
  <url>
    <loc>https://adzstreet.com/category/${slugify(category)}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
    });

    // Category + city pages
    result.rows.forEach((row) => {
      urls.push(`
  <url>
    <loc>https://adzstreet.com/category/${slugify(
      row.category
    )}/${slugify(row.city)}</loc>
    <lastmod>${new Date(
      row.updated_at || new Date()
    ).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Categories sitemap error:", err);
    res.status(500).send("Failed to generate categories sitemap");
  }
}