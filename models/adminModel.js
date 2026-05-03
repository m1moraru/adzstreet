import pool from '../config/db.js';

async function getDashboardStats() {
  const query = `
    SELECT
      (SELECT COUNT(*)::int FROM providers) AS "totalProviders",
      (SELECT COUNT(*)::int FROM providers WHERE is_active = true) AS "activeProviders",
      (SELECT COUNT(*)::int FROM providers WHERE is_active = false) AS "inactiveProviders",
      (SELECT COUNT(*)::int FROM providers WHERE is_published = true) AS "publishedAds",
      (SELECT COUNT(*)::int FROM providers WHERE is_published = false) AS "unpublishedAds",
      (SELECT COUNT(*)::int FROM providers WHERE age_verification_status = 'pending') AS "pendingVerification",
      (SELECT COUNT(*)::int FROM providers WHERE age_verification_status = 'verified') AS "verifiedProviders",
      (SELECT COUNT(*)::int FROM providers WHERE age_verification_status = 'failed') AS "rejectedProviders",
      (SELECT COUNT(*)::int FROM provider_media) AS "totalMedia",
      (
        SELECT COUNT(*)::int
        FROM providers
        WHERE created_at >= NOW() - INTERVAL '7 days'
      ) AS "newLast7Days";
  `;

  const { rows } = await pool.query(query);
  return rows[0];
}

async function getProviders(filters = {}) {
  const values = [];
  const conditions = ['1=1'];

  if (filters.status && filters.status !== 'all') {
    values.push(filters.status);
    conditions.push(`p.age_verification_status = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`(
      p.name ILIKE $${values.length}
      OR p.email ILIKE $${values.length}
      OR p.phone ILIKE $${values.length}
      OR p.public_id::text ILIKE $${values.length}
    )`);
  }

  if (filters.published === 'true') {
    conditions.push(`p.is_published = true`);
  }

  if (filters.published === 'false') {
    conditions.push(`p.is_published = false`);
  }

  if (filters.active === 'true') {
    conditions.push(`p.is_active = true`);
  }

  if (filters.active === 'false') {
    conditions.push(`p.is_active = false`);
  }

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  const offset = (page - 1) * limit;

  values.push(limit);
  const limitIndex = values.length;

  values.push(offset);
  const offsetIndex = values.length;

  const query = `
    SELECT
      p.id,
      p.public_id AS "publicId",
      p.name,
      p.profile_title AS "profileTitle",
      p.city,
      p.country,
      p.category,
      p.price,
      p.age,
      p.nationality,
      p.hair,
      p.eyes,
      p.height,
      p.phone,
      p.email,
      p.whatsapp_enabled AS "whatsappEnabled",
      p.telegram_enabled AS "telegramEnabled",
      p.telegram_username AS "telegramUsername",
      p.service_mode AS "serviceMode",
      p.payment_status AS "paymentStatus",
      p.age_verified AS "ageVerified",
      p.age_verification_status AS "ageVerificationStatus",
      p.age_verified_at AS "ageVerifiedAt",
      p.is_published AS "isPublished",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",

      COALESCE(
        (
          SELECT COUNT(*)
          FROM provider_media pm
          WHERE pm.provider_id = p.id
        ),
        0
      ) AS "mediaCount",

      COALESCE(
        (
          SELECT json_agg(media_url ORDER BY sort_order ASC)
          FROM provider_media
          WHERE provider_id = p.id AND media_type = 'image'
        ),
        '[]'::json
      ) AS gallery
    FROM providers p
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.created_at DESC
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex};
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

async function getProviderById(providerId) {
  const query = `
    SELECT
      p.id,
      p.public_id AS "publicId",
      p.name,
      p.profile_title AS "profileTitle",
      p.city,
      p.country,
      p.category,
      p.price,
      p.age,
      p.nationality,
      p.hair,
      p.eyes,
      p.height,
      p.phone,
      p.email,
      p.whatsapp_enabled AS "whatsappEnabled",
      p.telegram_enabled AS "telegramEnabled",
      p.telegram_username AS "telegramUsername",
      p.service_mode AS "serviceMode",
      p.bio,
      p.plan_id AS "planId",
      p.plan_duration AS "planDuration",
      p.payment_status AS "paymentStatus",
      p.age_verified AS "ageVerified",
      p.age_verification_status AS "ageVerificationStatus",
      p.age_verified_at AS "ageVerifiedAt",
      p.is_published AS "isPublished",
      p.is_active AS "isActive",
      p.created_at AS "createdAt",
      p.updated_at AS "updatedAt",

      COALESCE(
        (
          SELECT json_agg(area_name ORDER BY area_name)
          FROM provider_locations
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS locations,

      COALESCE(
        (
          SELECT json_agg(location_type ORDER BY location_type)
          FROM provider_location_types
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS "locationType",

      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'name', service_name,
              'isFeatured', is_featured
            )
            ORDER BY created_at ASC
          )
          FROM provider_services
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS services,

      COALESCE(
        (
          SELECT json_object_agg(rate_label, amount)
          FROM provider_rates
          WHERE provider_id = p.id
        ),
        '{}'::json
      ) AS rates,

      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', id,
              'url', media_url,
              'type', media_type,
              'sortOrder', sort_order,
              'createdAt', created_at
            )
            ORDER BY sort_order ASC
          )
          FROM provider_media
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS media
    FROM providers p
    WHERE p.id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function verifyProviderAge(providerId) {
  const query = `
    UPDATE providers
    SET
      age_verified = true,
      age_verification_status = 'verified',
      age_verified_at = NOW(),
      is_published = true,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function rejectProviderAge(providerId) {
  const query = `
    UPDATE providers
    SET
      age_verified = false,
      age_verification_status = 'failed',
      is_published = false,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function publishAd(providerId) {
  const query = `
    UPDATE providers
    SET
      is_published = true,
      updated_at = NOW()
    WHERE id = $1
      AND is_active = true
      AND age_verified = true
      AND age_verification_status = 'verified'
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function unpublishAd(providerId) {
  const query = `
    UPDATE providers
    SET
      is_published = false,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function suspendAccount(providerId) {
  const query = `
    UPDATE providers
    SET
      is_active = false,
      is_published = false,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function reactivateAccount(providerId) {
  const query = `
    UPDATE providers
    SET
      is_active = true,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function deleteProvider(providerId) {
  const query = `
    UPDATE providers
    SET
      is_active = false,
      is_published = false,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function deleteMedia(providerId, mediaId) {
  const query = `
    DELETE FROM provider_media
    WHERE id = $1 AND provider_id = $2
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [mediaId, providerId]);
  return rows[0] || null;
}

async function getPendingProviders() {
  return getProviders({ status: 'pending', page: 1, limit: 100 });
}

export default {
  getDashboardStats,
  getProviders,
  getProviderById,
  verifyProviderAge,
  rejectProviderAge,
  publishAd,
  unpublishAd,
  suspendAccount,
  reactivateAccount,
  deleteProvider,
  deleteMedia,
  getPendingProviders,
};