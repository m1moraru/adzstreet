// controllers/adsController.js
import bcrypt from "bcrypt";
import pool from "../config/db.js";
import { uploadToR2, deleteFromR2 } from "../config/r2.js";

const detailInsertQueries = {
  "buy-sell": {
    table: "buy_sell_ad_details",
    fields: [
      "item_category",
      "condition",
      "brand",
      "model",
      "negotiable",
      "delivery_option",
      "collection_area",
      "warranty",
      "payment_preference",
    ],
    values: (body) => [
      body.itemCategory,
      body.condition,
      body.brand,
      body.model,
      body.negotiable,
      body.deliveryOption,
      body.collectionArea,
      body.warranty,
      body.paymentPreference,
    ],
  },

  classes: {
    table: "classes_ad_details",
    fields: [
      "class_category",
      "level",
      "delivery_mode",
      "duration",
      "schedule",
      "teacher_name",
      "qualification",
      "group_size",
      "trial_available",
      "syllabus",
    ],
    values: (body) => [
      body.classCategory,
      body.level,
      body.deliveryMode,
      body.duration,
      body.schedule,
      body.teacherName,
      body.qualification,
      body.groupSize,
      body.trialAvailable,
      body.syllabus,
    ],
  },

  "free-personals": {
    table: "free_personals_ad_details",
    fields: [
      "display_name",
      "age",
      "gender",
      "looking_for",
      "relationship_type",
      "interests",
      "lifestyle",
      "contact_preference",
      "privacy_preference",
    ],
    values: (body) => [
      body.displayName,
      body.age || null,
      body.gender,
      body.lookingFor,
      body.relationshipType,
      body.interests,
      body.lifestyle,
      body.contactPreference,
      body.privacyPreference,
    ],
  },

  jobs: {
    table: "jobs_ad_details",
    fields: [
      "company_name",
      "job_type",
      "work_mode",
      "salary",
      "experience_level",
      "skills",
      "application_email",
    ],
    values: (body) => [
      body.companyName,
      body.jobType,
      body.workMode,
      body.salary,
      body.experienceLevel,
      body.skills,
      body.applicationEmail,
    ],
  },

  property: {
    table: "property_ad_details",
    fields: [
      "property_type",
      "listing_type",
      "bedrooms",
      "bathrooms",
      "deposit",
      "furnished",
      "available_from",
      "address_area",
    ],
    values: (body) => [
      body.propertyType,
      body.listingType,
      body.bedrooms || null,
      body.bathrooms || null,
      body.deposit,
      body.furnished,
      body.availableFrom || null,
      body.addressArea,
    ],
  },

  services: {
    table: "services_ad_details",
    fields: [
      "service_category",
      "business_name",
      "experience",
      "service_area",
      "availability",
      "pricing",
      "callout_available",
      "insurance",
      "website",
      "includes",
    ],
    values: (body) => [
      body.serviceCategory,
      body.businessName,
      body.experience || null,
      body.serviceArea,
      body.availability,
      body.pricing,
      body.calloutAvailable,
      body.insurance,
      body.website,
      body.includes,
    ],
  },

  vehicles: {
    table: "vehicles_ad_details",
    fields: [
      "vehicle_type",
      "make",
      "model",
      "year",
      "mileage",
      "fuel_type",
      "transmission",
      "condition",
    ],
    values: (body) => [
      body.vehicleType,
      body.make,
      body.model,
      body.year || null,
      body.mileage,
      body.fuelType,
      body.transmission,
      body.condition,
    ],
  },
};

export async function createAd(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      category,
      title,
      description,
      name,
      phone,
      email,
      password,
      city,
      country,
      price,
      priceText,
    } = req.body;

    if (!category || !name || !email || !city || !country) {
      return res.status(400).json({
        message: "Category, name, email, city, and country are required",
      });
    }

    if (!detailInsertQueries[category]) {
      return res.status(400).json({
        message: "Invalid ad category",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    let userId;

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    } else {
      if (!password || password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters",
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await client.query(
        `
        INSERT INTO users (full_name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
        `,
        [name.trim(), normalizedEmail, passwordHash]
      );

      userId = newUser.rows[0].id;
    }

    const adResult = await client.query(
      `
      INSERT INTO ads (
        user_id,
        category,
        title,
        description,
        name,
        phone,
        email,
        city,
        country,
        price_text,
        is_active,
        is_published,
        payment_status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      RETURNING *
      `,
      [
        userId,
        category,
        title || `${category} ad`,
        description || null,
        name.trim(),
        phone || null,
        normalizedEmail,
        city,
        country,
        price || priceText || null,
        true,
        true,
        "paid",
      ]
    );

    const ad = adResult.rows[0];

    const detailConfig = detailInsertQueries[category];
    const detailValues = detailConfig.values(req.body);

    const placeholders = detailValues
      .map((_, index) => `$${index + 2}`)
      .join(", ");

    await client.query(
      `
      INSERT INTO ${detailConfig.table} (
        ad_id,
        ${detailConfig.fields.join(", ")}
      )
      VALUES ($1, ${placeholders})
      `,
      [ad.id, ...detailValues]
    );

    if (req.files?.length) {
      for (let i = 0; i < req.files.length; i++) {
        const imageUrl = await uploadToR2(req.files[i], "ads");

        await client.query(
          `
          INSERT INTO ad_photos (
            ad_id,
            image_url,
            sort_order,
            is_main
          )
          VALUES ($1, $2, $3, $4)
          `,
          [ad.id, imageUrl, i, i === 0]
        );
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Ad created successfully",
      ad,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create ad error:", err);

    return res.status(500).json({
      message: "Failed to create ad",
    });
  } finally {
    client.release();
  }
}

export async function getAds(req, res) {
  try {
    const {
      category,
      city,
      country,
      search,
      limit = 24,
      offset = 0,
    } = req.query;

    const conditions = [
      "a.is_active = true",
      "a.is_published = true",
      "a.is_sold = false",
    ];

    const values = [];

    // CATEGORY
    if (category) {
      values.push(category);
      conditions.push(`a.category = $${values.length}`);
    }

    // CITY
    if (city) {
      values.push(`%${city}%`);
      conditions.push(`a.city ILIKE $${values.length}`);
    }

    // COUNTRY
    if (country) {
      values.push(`%${country}%`);
      conditions.push(`a.country ILIKE $${values.length}`);
    }

    // SEARCH
    if (search) {
      values.push(`%${search}%`);

      conditions.push(`
        (
          a.title ILIKE $${values.length}
          OR a.description ILIKE $${values.length}
          OR a.city ILIKE $${values.length}
          OR a.category ILIKE $${values.length}
        )
      `);
    }

    // LIMIT
    values.push(Number(limit));
    const limitIndex = values.length;

    // OFFSET
    values.push(Number(offset));
    const offsetIndex = values.length;

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.public_id,
        a.category,
        a.title,
        a.description,
        a.name,
        a.city,
        a.country,
        a.price_text,
        a.created_at,

        p.image_url AS main_photo

      FROM ads a

      LEFT JOIN LATERAL (
        SELECT image_url
        FROM ad_photos
        WHERE ad_id = a.id
        ORDER BY is_main DESC, sort_order ASC, created_at ASC
        LIMIT 1
      ) p ON true

      WHERE ${conditions.join(" AND ")}

      ORDER BY a.created_at DESC

      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
      `,
      values
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("GET ADS ERROR:", err);

    return res.status(500).json({
      message: "Failed to fetch ads",
      error: err.message,
    });
  }
}

export async function getRelatedAds(req, res) {
  try {
    const {
      category,
      subcategory,
      exclude,
      limit = 8,
    } = req.query;

    if (!category) {
      return res.status(400).json({
        message: "Category is required",
      });
    }

    const values = [category];
    const conditions = [
      "a.category = $1",
      "a.is_active = true",
      "a.is_published = true",
      "a.is_sold = false",
    ];

    if (exclude) {
      values.push(exclude);
      conditions.push(`a.id::text != $${values.length}`);
    }

    values.push(Number(limit));
    const limitIndex = values.length;

    const result = await pool.query(
      `
      SELECT
        a.id,
        a.public_id,
        a.category,
        a.title,
        a.city,
        a.country,
        a.price_text,
        a.created_at,
        p.image_url AS main_photo
      FROM ads a
      LEFT JOIN ad_photos p
        ON p.ad_id = a.id
        AND p.is_main = true
      WHERE ${conditions.join(" AND ")}
      ORDER BY a.created_at DESC
      LIMIT $${limitIndex}
      `,
      values
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Related ads error:", err);

    return res.status(500).json({
      message: "Failed to fetch related ads",
      error: err.message,
    });
  }
}

export async function getAdById(req, res) {
  try {
    const { id } = req.params;

    // MAIN AD
    const adResult = await pool.query(
      `
      SELECT *
      FROM ads
      WHERE public_id::text = $1
         OR id::text = $1
      LIMIT 1
      `,
      [id]
    );

    if (adResult.rows.length === 0) {
      return res.status(404).json({
        message: "Ad not found",
      });
    }

    const ad = adResult.rows[0];

    // PHOTOS
    const photosResult = await pool.query(
      `
      SELECT *
      FROM ad_photos
      WHERE ad_id = $1
      ORDER BY sort_order ASC
      `,
      [ad.id]
    );

    // DETAILS TABLES
    const detailsTableMap = {
      "buy-sell": "buy_sell_ad_details",
      vehicles: "vehicles_ad_details",
      property: "property_ad_details",
      jobs: "jobs_ad_details",
      services: "services_ad_details",
      classes: "classes_ad_details",
      "free-personals": "free_personals_ad_details",
    };

    const tableName = detailsTableMap[ad.category];

    let details = {};

    if (tableName) {
      const detailsResult = await pool.query(
        `
        SELECT *
        FROM ${tableName}
        WHERE ad_id = $1
        LIMIT 1
        `,
        [ad.id]
      );

      details = detailsResult.rows[0] || {};
    }

    return res.status(200).json({
      ...ad,
      photos: photosResult.rows,
      details,
    });
  } catch (err) {
    console.error("GET AD ERROR:", err);

    return res.status(500).json({
      message: "Failed to fetch ad",
      error: err.message,
    });
  }
}

export async function getMyAds(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const result = await pool.query(
      `
      SELECT
        a.*,
        p.image_url AS main_photo
      FROM ads a
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM ad_photos
        WHERE ad_id = a.id
        ORDER BY is_main DESC, sort_order ASC, created_at ASC
        LIMIT 1
      ) p ON true
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
      `,
      [req.user.id]
    );

    return res.json({
      success: true,
      ads: result.rows,
    });
  } catch (err) {
    console.error("Get my ads error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user ads",
    });
  }
}

//--------  User Dashboard ------

const detailUpdateQueries = {
  "buy-sell": {
    table: "buy_sell_ad_details",
    fields: {
      itemCategory: "item_category",
      condition: "condition",
      brand: "brand",
      model: "model",
      negotiable: "negotiable",
      deliveryOption: "delivery_option",
      collectionArea: "collection_area",
      warranty: "warranty",
      paymentPreference: "payment_preference",
    },
  },

  classes: {
    table: "classes_ad_details",
    fields: {
      classCategory: "class_category",
      level: "level",
      deliveryMode: "delivery_mode",
      duration: "duration",
      schedule: "schedule",
      teacherName: "teacher_name",
      qualification: "qualification",
      groupSize: "group_size",
      trialAvailable: "trial_available",
      syllabus: "syllabus",
    },
  },

  "free-personals": {
    table: "free_personals_ad_details",
    fields: {
      displayName: "display_name",
      age: "age",
      gender: "gender",
      lookingFor: "looking_for",
      relationshipType: "relationship_type",
      interests: "interests",
      lifestyle: "lifestyle",
      contactPreference: "contact_preference",
      privacyPreference: "privacy_preference",
    },
  },

  jobs: {
    table: "jobs_ad_details",
    fields: {
      companyName: "company_name",
      jobType: "job_type",
      workMode: "work_mode",
      salary: "salary",
      experienceLevel: "experience_level",
      skills: "skills",
      applicationEmail: "application_email",
    },
  },

  property: {
    table: "property_ad_details",
    fields: {
      propertyType: "property_type",
      listingType: "listing_type",
      bedrooms: "bedrooms",
      bathrooms: "bathrooms",
      deposit: "deposit",
      furnished: "furnished",
      availableFrom: "available_from",
      addressArea: "address_area",
    },
  },

  services: {
    table: "services_ad_details",
    fields: {
      serviceCategory: "service_category",
      businessName: "business_name",
      experience: "experience",
      serviceArea: "service_area",
      availability: "availability",
      pricing: "pricing",
      calloutAvailable: "callout_available",
      insurance: "insurance",
      website: "website",
      includes: "includes",
    },
  },

  vehicles: {
    table: "vehicles_ad_details",
    fields: {
      vehicleType: "vehicle_type",
      make: "make",
      model: "model",
      year: "year",
      mileage: "mileage",
      fuelType: "fuel_type",
      transmission: "transmission",
      condition: "condition",
    },
  },
};

export async function updateMyAd(req, res) {
  const client = await pool.connect();

  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const { id } = req.params;
    const normalizedBody = { ...req.body };

    ["is_active", "is_published", "is_sold"].forEach((key) => {
      if (normalizedBody[key] === "true") normalizedBody[key] = true;
      if (normalizedBody[key] === "false") normalizedBody[key] = false;
    });

    await client.query("BEGIN");

    const adCheck = await client.query(
      `
      SELECT id, category, price_text
      FROM ads
      WHERE id::text = $1
        AND user_id = $2
      LIMIT 1
      `,
      [id, req.user.id]
    );

    if (adCheck.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Ad not found or not allowed",
      });
    }

    const ad = adCheck.rows[0];

    const incomingPrice =
      normalizedBody.price_text ??
      normalizedBody.priceText ??
      normalizedBody.price;

    if (incomingPrice !== undefined) {
      const oldPriceNumber = Number(
        String(ad.price_text || "").replace(/[^\d]/g, "")
      );

      const newPriceNumber = Number(
        String(incomingPrice || "").replace(/[^\d]/g, "")
      );

      if (
        oldPriceNumber > 0 &&
        newPriceNumber > 0 &&
        newPriceNumber < oldPriceNumber
      ) {
        normalizedBody.previous_price_text = ad.price_text;
      } else {
        normalizedBody.previous_price_text = null;
      }
    }

    const baseFields = {
      title: "title",
      description: "description",
      name: "name",
      phone: "phone",
      email: "email",
      city: "city",
      country: "country",
      price: "price_text",
      priceText: "price_text",
      price_text: "price_text",
      previous_price_text: "previous_price_text",
      is_active: "is_active",
      is_published: "is_published",
      is_sold: "is_sold",
    };

    const baseUpdates = [];
    const baseValues = [];

    for (const [bodyField, dbField] of Object.entries(baseFields)) {
      if (normalizedBody[bodyField] !== undefined) {
        baseValues.push(normalizedBody[bodyField]);
        baseUpdates.push(`${dbField} = $${baseValues.length}`);
      }
    }

    if (baseUpdates.length > 0) {
      baseValues.push(ad.id);

      await client.query(
        `
        UPDATE ads
        SET ${baseUpdates.join(", ")},
            updated_at = NOW()
        WHERE id = $${baseValues.length}
        `,
        baseValues
      );
    }

    const detailConfig = detailUpdateQueries[ad.category];

    if (detailConfig) {
      const detailUpdates = [];
      const detailValues = [];

      for (const [bodyField, dbField] of Object.entries(detailConfig.fields)) {
        if (normalizedBody[bodyField] !== undefined) {
          detailValues.push(
            normalizedBody[bodyField] === "" ? null : normalizedBody[bodyField]
          );

          detailUpdates.push(`${dbField} = $${detailValues.length}`);
        }
      }

      if (detailUpdates.length > 0) {
        detailValues.push(ad.id);

        await client.query(
          `
          UPDATE ${detailConfig.table}
          SET ${detailUpdates.join(", ")}
          WHERE ad_id = $${detailValues.length}
          `,
          detailValues
        );
      }
    }

    let deletedPhotoIds = normalizedBody.deletedPhotoIds || [];

    if (typeof deletedPhotoIds === "string") {
      try {
        deletedPhotoIds = JSON.parse(deletedPhotoIds);
      } catch {
        deletedPhotoIds = deletedPhotoIds
          .split(",")
          .map((photoId) => photoId.trim())
          .filter(Boolean);
      }
    }

    // DELETE SELECTED PHOTOS
    if (Array.isArray(deletedPhotoIds) && deletedPhotoIds.length > 0) {
      const photosToDelete = await client.query(
        `
        SELECT id, image_url
        FROM ad_photos
        WHERE ad_id = $1
          AND id = ANY($2::uuid[])
        `,
        [ad.id, deletedPhotoIds]
      );

      for (const photo of photosToDelete.rows) {
        try {
          await deleteFromR2(photo.image_url);
        } catch (r2Err) {
          console.error("R2 delete failed:", r2Err);
        }
      }

      await client.query(
        `
        DELETE FROM ad_photos
        WHERE ad_id = $1
          AND id = ANY($2::uuid[])
        `,
        [ad.id, deletedPhotoIds]
      );

      // RESET MAIN PHOTO
      await client.query(
        `
        UPDATE ad_photos
        SET is_main = false
        WHERE ad_id = $1
        `,
        [ad.id]
      );

      await client.query(
        `
        UPDATE ad_photos
        SET is_main = true
        WHERE id = (
          SELECT id
          FROM ad_photos
          WHERE ad_id = $1
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 1
        )
        `,
        [ad.id]
      );
    }

    // REPLACE ALL PHOTOS
    if (normalizedBody.replacePhotos === "true") {
      const oldPhotos = await client.query(
        `
        SELECT image_url
        FROM ad_photos
        WHERE ad_id = $1
        `,
        [ad.id]
      );

      for (const photo of oldPhotos.rows) {
        try {
          await deleteFromR2(photo.image_url);
        } catch (r2Err) {
          console.error("R2 delete failed:", r2Err);
        }
      }

      await client.query(
        `
        DELETE FROM ad_photos
        WHERE ad_id = $1
        `,
        [ad.id]
      );
    }

    // ADD NEW PHOTOS
    if (req.files?.length) {
      const existingPhotos = await client.query(
        `
        SELECT COUNT(*)::int AS count
        FROM ad_photos
        WHERE ad_id = $1
        `,
        [ad.id]
      );

      const startIndex = existingPhotos.rows[0].count;

      for (let i = 0; i < req.files.length; i++) {
        const imageUrl = await uploadToR2(req.files[i], "ads");

        await client.query(
          `
          INSERT INTO ad_photos (
            ad_id,
            image_url,
            sort_order,
            is_main
          )
          VALUES ($1, $2, $3, $4)
          `,
          [
            ad.id,
            imageUrl,
            startIndex + i,
            startIndex === 0 && i === 0,
          ]
        );
      }
    }

    // ENSURE EXACTLY ONE MAIN PHOTO EXISTS
    const hasMainPhoto = await client.query(
      `
      SELECT id
      FROM ad_photos
      WHERE ad_id = $1
        AND is_main = true
      LIMIT 1
      `,
      [ad.id]
    );

    if (hasMainPhoto.rows.length === 0) {
      await client.query(
        `
        UPDATE ad_photos
        SET is_main = false
        WHERE ad_id = $1
        `,
        [ad.id]
      );

      await client.query(
        `
        UPDATE ad_photos
        SET is_main = true
        WHERE id = (
          SELECT id
          FROM ad_photos
          WHERE ad_id = $1
          ORDER BY sort_order ASC, created_at ASC
          LIMIT 1
        )
        `,
        [ad.id]
      );
    }

    const updatedAd = await client.query(
      `
      SELECT *
      FROM ads
      WHERE id = $1
      `,
      [ad.id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Ad updated successfully",
      ad: updatedAd.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Update full ad error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update ad",
      error: err.message,
    });
  } finally {
    client.release();
  }
}

export async function deleteMyAd(req, res) {
  const client = await pool.connect();

  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    await client.query("BEGIN");

    const { id } = req.params;

    const adResult = await client.query(
      `
      SELECT id
      FROM ads
      WHERE id::text = $1
        AND user_id = $2
      LIMIT 1
      `,
      [id, req.user.id]
    );

    if (adResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Ad not found or not allowed",
      });
    }

    const adId = adResult.rows[0].id;

    const detailTables = [
      "buy_sell_ad_details",
      "classes_ad_details",
      "free_personals_ad_details",
      "jobs_ad_details",
      "property_ad_details",
      "services_ad_details",
      "vehicles_ad_details",
    ];

    for (const table of detailTables) {
      await client.query(`DELETE FROM ${table} WHERE ad_id = $1`, [adId]);
    }

    await client.query("DELETE FROM ad_photos WHERE ad_id = $1", [adId]);

    await client.query(
      `
      DELETE FROM ads
      WHERE id = $1
        AND user_id = $2
      `,
      [adId, req.user.id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Ad deleted successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Delete ad error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete ad",
    });
  } finally {
    client.release();
  }
}