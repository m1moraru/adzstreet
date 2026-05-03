import pool from '../config/db.js';

async function getAllProviders(filters = {}) {
  const values = [];
  const conditions = [
    'p.is_active = true',
    'p.is_published = true',
    'p.age_verified = true',
    `p.age_verification_status = 'verified'`,
  ];

  if (filters.city) {
    values.push(filters.city);
    conditions.push(`p.city = $${values.length}`);
  }

  if (filters.country) {
    values.push(filters.country);
    conditions.push(`p.country = $${values.length}`);
  }

  if (filters.minPrice) {
    values.push(Number(filters.minPrice));
    conditions.push(`p.price >= $${values.length}`);
  }

  if (filters.maxPrice) {
    values.push(Number(filters.maxPrice));
    conditions.push(`p.price <= $${values.length}`);
  }

  const query = `
    SELECT
      p.public_id AS id,
      p.name,
      p.city,
      p.country,
      p.price,
      p.age,
      p.nationality,
      p.hair,
      p.eyes,
      p.height,
      p.phone,
      p.service_mode AS "serviceMode",
      p.age_verified AS "ageVerified",
      p.age_verification_status AS "ageVerificationStatus",
      p.is_published AS "isPublished",

      COALESCE(
        (
          SELECT json_agg(area_name ORDER BY area_name)
          FROM provider_locations
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS location,

      COALESCE(
        (
          SELECT json_agg(location_type ORDER BY location_type)
          FROM provider_location_types
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS "locationType",

      (
        SELECT media_url
        FROM provider_media
        WHERE provider_id = p.id AND media_type = 'image'
        ORDER BY sort_order ASC
        LIMIT 1
      ) AS image,

      COALESCE(
        (
          SELECT json_agg(media_url ORDER BY sort_order ASC)
          FROM provider_media
          WHERE provider_id = p.id AND media_type = 'image'
        ),
        '[]'::json
      ) AS gallery,

      COALESCE(
        (
          SELECT json_agg(media_url ORDER BY sort_order ASC)
          FROM provider_media
          WHERE provider_id = p.id AND media_type = 'video'
        ),
        '[]'::json
      ) AS videos,

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
          SELECT json_agg(badge_label ORDER BY created_at ASC)
          FROM provider_badges
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS "trustBadges",

      COALESCE(
        to_json(string_to_array(COALESCE(p.bio, ''), E'\\n\\n')),
        '[]'::json
      ) AS "descriptionParagraphs"

    FROM providers p
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.created_at DESC;
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

async function getProviderByPublicId(publicId) {
  const query = `
    SELECT
      p.public_id AS id,
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
      p.plan_id AS "planId",
      p.plan_duration AS "planDuration",
      p.payment_status AS "paymentStatus",
      p.age_verified AS "ageVerified",
      p.age_verification_status AS "ageVerificationStatus",
      p.age_verified_at AS "ageVerifiedAt",
      p.is_published AS "isPublished",

      COALESCE(
        (
          SELECT json_agg(area_name ORDER BY area_name)
          FROM provider_locations
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS location,

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
          SELECT json_agg(media_url ORDER BY sort_order ASC)
          FROM provider_media
          WHERE provider_id = p.id AND media_type = 'image'
        ),
        '[]'::json
      ) AS gallery,

      COALESCE(
        (
          SELECT json_agg(media_url ORDER BY sort_order ASC)
          FROM provider_media
          WHERE provider_id = p.id AND media_type = 'video'
        ),
        '[]'::json
      ) AS videos,

      COALESCE(
        (
          SELECT json_agg(badge_label ORDER BY created_at ASC)
          FROM provider_badges
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS "trustBadges",

      COALESCE(
        to_json(string_to_array(COALESCE(p.bio, ''), E'\\n\\n')),
        '[]'::json
      ) AS "descriptionParagraphs"

    FROM providers p
    WHERE p.public_id = $1
      AND p.is_active = true
      AND p.is_published = true
      AND p.age_verified = true
      AND p.age_verification_status = 'verified'
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [publicId]);
  return rows[0] || null;
}

async function getProviderByInternalId(providerId) {
  const query = `
    SELECT
      p.id AS "internalId",
      p.public_id AS id,
      p.name,
      p.profile_title AS "profileTitle",
      p.city,
      p.country,
      p.category,
      p.price,
      p.age_verified AS "ageVerified",
      p.age_verification_status AS "ageVerificationStatus",
      p.age_verified_at AS "ageVerifiedAt",
      p.is_published AS "isPublished",
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
      p.plan_id AS "planId",
      p.plan_duration AS "planDuration",
      p.payment_status AS "paymentStatus",

      COALESCE(
        (
          SELECT json_agg(area_name ORDER BY area_name)
          FROM provider_locations
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS location,

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
          SELECT json_agg(media_url ORDER BY sort_order ASC)
          FROM provider_media
          WHERE provider_id = p.id AND media_type = 'image'
        ),
        '[]'::json
      ) AS gallery,

      COALESCE(
        (
          SELECT json_agg(media_url ORDER BY sort_order ASC)
          FROM provider_media
          WHERE provider_id = p.id AND media_type = 'video'
        ),
        '[]'::json
      ) AS videos,

      COALESCE(
        (
          SELECT json_agg(badge_label ORDER BY created_at ASC)
          FROM provider_badges
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS "trustBadges",

      COALESCE(
        to_json(string_to_array(COALESCE(p.bio, ''), E'\\n\\n')),
        '[]'::json
      ) AS "descriptionParagraphs"

    FROM providers p
    WHERE p.id = $1 AND p.is_active = true
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function createProvider(payload) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertProvider = `
      INSERT INTO providers (
        name,
        profile_title,
        city,
        country,
        category,
        price,
        age,
        nationality,
        hair,
        eyes,
        height,
        phone,
        whatsapp_enabled,
        telegram_enabled,
        telegram_username,
        service_mode,
        bio,
        email,
        password_hash,
        plan_id,
        plan_duration,
        payment_status,
        age_verified,
        age_verification_status,
        age_verified_at,
        is_published
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
      )
      RETURNING *;
    `;

    const values = [
      payload.name,
      payload.profileTitle,
      payload.city,
      payload.country || null,
      payload.category || 'Massage Therapist',
      payload.price || 0,
      payload.age || null,
      payload.nationality || null,
      payload.hair || null,
      payload.eyes || null,
      payload.height || null,
      payload.phone || null,
      payload.whatsappEnabled || false,
      payload.telegramEnabled || false,
      payload.telegramUsername || null,
      payload.serviceMode || 'in_call',
      payload.bio || null,
      payload.email || null,
      payload.passwordHash || null,
      payload.planId || 'essential',
      payload.planDuration || '7d',
      payload.paymentStatus || 'pending',
      payload.ageVerified || false,
      payload.ageVerificationStatus || 'pending',
      payload.ageVerifiedAt || null,
      payload.isPublished || false,
    ];

    const result = await client.query(insertProvider, values);
    const provider = result.rows[0];

    if (Array.isArray(payload.services)) {
      for (const service of payload.services) {
        let serviceName = '';
        let isFeatured = false;

        if (typeof service === 'string') {
          serviceName = service.trim();
        } else if (service && typeof service === 'object') {
          serviceName = typeof service.name === 'string' ? service.name.trim() : '';
          isFeatured = Boolean(service.isFeatured);
        }

        if (!serviceName) continue;

        await client.query(
          `INSERT INTO provider_services (provider_id, service_name, is_featured)
           VALUES ($1, $2, $3)`,
          [provider.id, serviceName, isFeatured]
        );
      }
    }

    if (payload.rates && typeof payload.rates === 'object') {
      for (const [label, amount] of Object.entries(payload.rates)) {
        if (
          amount !== '' &&
          amount !== null &&
          amount !== undefined &&
          !Number.isNaN(Number(amount))
        ) {
          await client.query(
            `INSERT INTO provider_rates (provider_id, rate_label, amount)
             VALUES ($1, $2, $3)`,
            [provider.id, label, Number(amount)]
          );
        }
      }
    }

    if (Array.isArray(payload.locations)) {
      for (const areaName of payload.locations) {
        if (!areaName) continue;
        await client.query(
          `INSERT INTO provider_locations (provider_id, area_name)
           VALUES ($1, $2)`,
          [provider.id, areaName]
        );
      }
    }

    if (Array.isArray(payload.locationType)) {
      for (const locationType of payload.locationType) {
        if (!locationType) continue;
        await client.query(
          `INSERT INTO provider_location_types (provider_id, location_type)
           VALUES ($1, $2)`,
          [provider.id, locationType]
        );
      }
    }

    if (Array.isArray(payload.gallery)) {
      for (let i = 0; i < payload.gallery.length; i += 1) {
        await client.query(
          `INSERT INTO provider_media (provider_id, media_type, media_url, sort_order)
           VALUES ($1, 'image', $2, $3)`,
          [provider.id, payload.gallery[i], i]
        );
      }
    }

    if (Array.isArray(payload.videos)) {
      for (let i = 0; i < payload.videos.length; i += 1) {
        await client.query(
          `INSERT INTO provider_media (provider_id, media_type, media_url, sort_order)
           VALUES ($1, 'video', $2, $3)`,
          [provider.id, payload.videos[i], i]
        );
      }
    }

    if (Array.isArray(payload.trustBadges)) {
      for (const badge of payload.trustBadges) {
        if (!badge) continue;
        await client.query(
          `INSERT INTO provider_badges (provider_id, badge_label)
           VALUES ($1, $2)`,
          [provider.id, badge]
        );
      }
    }

    await client.query('COMMIT');
    return provider;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateProvider(providerId, payload) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updateQuery = `
      UPDATE providers
      SET
        name = $1,
        profile_title = $2,
        city = $3,
        country = $4,
        price = $5,
        age = $6,
        nationality = $7,
        hair = $8,
        eyes = $9,
        height = $10,
        phone = $11,
        whatsapp_enabled = $12,
        telegram_enabled = $13,
        telegram_username = $14,
        service_mode = $15,
        bio = $16,
        email = $17,
        plan_id = $18,
        plan_duration = $19,
        updated_at = NOW()
      WHERE id = $20
      RETURNING id;
    `;

    await client.query(updateQuery, [
      payload.name,
      payload.profileTitle,
      payload.city,
      payload.country || null,
      payload.price || 0,
      payload.age || null,
      payload.nationality || null,
      payload.hair || null,
      payload.eyes || null,
      payload.height || null,
      payload.phone || null,
      payload.whatsappEnabled || false,
      payload.telegramEnabled || false,
      payload.telegramUsername || null,
      payload.serviceMode || 'in_call',
      payload.bio || null,
      payload.email || null,
      payload.planId || 'essential',
      payload.planDuration || '7d',
      providerId,
    ]);

    await client.query(`DELETE FROM provider_services WHERE provider_id = $1`, [providerId]);
    await client.query(`DELETE FROM provider_rates WHERE provider_id = $1`, [providerId]);
    await client.query(`DELETE FROM provider_locations WHERE provider_id = $1`, [providerId]);
    await client.query(`DELETE FROM provider_location_types WHERE provider_id = $1`, [providerId]);
    await client.query(`DELETE FROM provider_media WHERE provider_id = $1`, [providerId]);

    if (Array.isArray(payload.services)) {
      for (const service of payload.services) {
        let serviceName = '';
        let isFeatured = false;

        if (typeof service === 'string') {
          serviceName = service.trim();
        } else if (service && typeof service === 'object') {
          serviceName = typeof service.name === 'string' ? service.name.trim() : '';
          isFeatured = Boolean(service.isFeatured);
        }

        if (!serviceName) continue;

        await client.query(
          `INSERT INTO provider_services (provider_id, service_name, is_featured)
           VALUES ($1, $2, $3)`,
          [providerId, serviceName, isFeatured]
        );
      }
    }

    if (payload.rates && typeof payload.rates === 'object') {
      for (const [label, amount] of Object.entries(payload.rates)) {
        if (
          amount !== '' &&
          amount !== null &&
          amount !== undefined &&
          !Number.isNaN(Number(amount))
        ) {
          await client.query(
            `INSERT INTO provider_rates (provider_id, rate_label, amount)
             VALUES ($1, $2, $3)`,
            [providerId, label, Number(amount)]
          );
        }
      }
    }

    if (Array.isArray(payload.locations)) {
      for (const areaName of payload.locations) {
        if (!areaName) continue;

        await client.query(
          `INSERT INTO provider_locations (provider_id, area_name)
           VALUES ($1, $2)`,
          [providerId, areaName]
        );
      }
    }

    if (Array.isArray(payload.locationType)) {
      for (const locationType of payload.locationType) {
        if (!locationType) continue;

        await client.query(
          `INSERT INTO provider_location_types (provider_id, location_type)
           VALUES ($1, $2)`,
          [providerId, locationType]
        );
      }
    }

    if (Array.isArray(payload.gallery)) {
      for (let i = 0; i < payload.gallery.length; i += 1) {
        await client.query(
          `INSERT INTO provider_media (provider_id, media_type, media_url, sort_order)
           VALUES ($1, 'image', $2, $3)`,
          [providerId, payload.gallery[i], i]
        );
      }
    }

    if (Array.isArray(payload.videos)) {
      for (let i = 0; i < payload.videos.length; i += 1) {
        await client.query(
          `INSERT INTO provider_media (provider_id, media_type, media_url, sort_order)
           VALUES ($1, 'video', $2, $3)`,
          [providerId, payload.videos[i], i]
        );
      }
    }

    await client.query('COMMIT');
    return await getProviderByInternalId(providerId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getProviderAuthByEmail(email) {
  const query = `
    SELECT
      id,
      public_id,
      name,
      email,
      city,
      country,
      age_verified,
      age_verification_status,
      is_published,
      password_hash,
      is_active
    FROM providers
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function getProviderAuthById(id) {
  const query = `
    SELECT
      id,
      public_id,
      name,
      email,
      city,
      country,
      age_verified,
      age_verification_status,
      is_published,
      is_active
    FROM providers
    WHERE id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function getProviderPasswordHashById(providerId) {
  const query = `
    SELECT id, password_hash
    FROM providers
    WHERE id = $1 AND is_active = true
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [providerId]);
  return rows[0] || null;
}

async function updateProviderPassword(providerId, passwordHash) {
  const query = `
    UPDATE providers
    SET password_hash = $1
    WHERE id = $2
    RETURNING id;
  `;

  const { rows } = await pool.query(query, [passwordHash, providerId]);
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

async function getProvidersForAdmin(filters = {}) {
  const values = [];
  const conditions = ['p.is_active = true'];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`p.age_verification_status = $${values.length}`);
  }

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

      (
        SELECT media_url
        FROM provider_media pm
        WHERE pm.provider_id = p.id
          AND pm.media_type = 'image'
        ORDER BY pm.sort_order ASC
        LIMIT 1
      ) AS image,

      (
        SELECT COUNT(*)
        FROM provider_media pm
        WHERE pm.provider_id = p.id
      )::int AS "mediaCount",

      COALESCE(
        (
          SELECT json_agg(area_name ORDER BY area_name)
          FROM provider_locations
          WHERE provider_id = p.id
        ),
        '[]'::json
      ) AS location,

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
          SELECT json_agg(pm.media_url ORDER BY pm.sort_order ASC)
          FROM provider_media pm
          WHERE pm.provider_id = p.id
            AND pm.media_type = 'image'
        ),
        '[]'::json
      ) AS gallery
    FROM providers p
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.created_at DESC;
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

//------------------ AGE VERIFICATION ------------ //

async function findByVerificationSessionId(sessionId) {
  const { rows } = await pool.query(
    "SELECT * FROM providers WHERE age_verification_session_id = $1 LIMIT 1",
    [sessionId]
  );
  return rows[0];
}

async function markAgeVerificationStarted(id, data) {
  const { rows } = await pool.query(
    `
    UPDATE providers
    SET
      age_verification_vendor = $1,
      age_verification_session_id = $2,
      age_verification_reference_id = $3,
      age_verification_status = 'started',
      age_verified = false,
      age_verification_failed_reason = NULL,
      updated_at = now()
    WHERE id = $4
    RETURNING *
    `,
    [data.vendor, data.sessionId, data.referenceId, id]
  );

  return rows[0] || null;
}

async function markAgeVerificationApproved(id) {
  const { rows } = await pool.query(
    `
    UPDATE providers
    SET
      age_verified = true,
      age_verification_status = 'approved',
      age_verified_at = now(),
      updated_at = now()
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return rows[0];
}

async function markAgeVerificationNeedsReview(id, reason) {
  const { rows } = await pool.query(
    `
    UPDATE providers
    SET
      age_verified = false,
      age_verification_status = 'needs_review',
      age_verification_failed_reason = $2,
      updated_at = now()
    WHERE id = $1
    RETURNING *
    `,
    [id, reason]
  );

  return rows[0];
}

async function markAgeVerificationDeclined(id, reason) {
  const { rows } = await pool.query(
    `
    UPDATE providers
    SET
      age_verified = false,
      age_verification_status = 'declined',
      age_verification_failed_reason = $2,
      updated_at = now()
    WHERE id = $1
    RETURNING *
    `,
    [id, reason]
  );

  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM providers WHERE id = $1 LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findByPublicId(publicId) {
  const { rows } = await pool.query(
    `SELECT * FROM providers WHERE public_id = $1 LIMIT 1`,
    [publicId]
  );

  return rows[0] || null;
}

export default {
  getAllProviders,
  getProviderByPublicId,
  getProviderByInternalId,
  createProvider,
  updateProvider,
  getProviderAuthByEmail,
  getProviderAuthById,
  getProviderPasswordHashById,
  updateProviderPassword,
  verifyProviderAge,
  rejectProviderAge,
  getProvidersForAdmin,
  findByVerificationSessionId,
  markAgeVerificationStarted,
  markAgeVerificationApproved,
  markAgeVerificationNeedsReview,
  markAgeVerificationDeclined,
  findById,
  findByPublicId,
};