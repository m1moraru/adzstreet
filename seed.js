import 'dotenv/config';
import providerModel from './models/providerModel.js';
import pool from './config/db.js';
import data from '../src/data/mockData.js';

function normalizeServiceMode(serviceMode) {
  switch (serviceMode) {
    case 'both':
      return 'both';
    case 'out_call':
      return 'out_call';
    case 'in_call':
      return 'in_call';
    case 'in-call / out-call':
      return 'both';
    default:
      return 'in_call';
  }
}

function normalizeLocations(location) {
  if (Array.isArray(location)) return location;
  if (typeof location === 'string' && location.trim()) return [location.trim()];
  return [];
}

function normalizeLocationType(locationType) {
  if (Array.isArray(locationType)) return locationType;
  if (typeof locationType === 'string' && locationType.trim()) {
    return [locationType.trim()];
  }
  return [];
}

function normalizeServices(services) {
  if (!Array.isArray(services)) return [];

  return services.map((service, index) => ({
    name: service,
    isFeatured: index < 3,
  }));
}

function normalizeGallery(item) {
  if (Array.isArray(item.gallery) && item.gallery.length > 0) {
    return item.gallery;
  }

  if (item.image) {
    return [item.image];
  }

  return [];
}

function normalizeVideos(videos) {
  return Array.isArray(videos) ? videos : [];
}

function normalizeBio(descriptionParagraphs) {
  if (!Array.isArray(descriptionParagraphs)) return null;
  return descriptionParagraphs.join('\n\n');
}

async function run() {
  try {
    for (const item of data) {
      const payload = {
        name: item.name,
        profileTitle: item.name,
        city: item.city,
        category: 'Massage Therapist',
        price: Number(item.price || item.rates?.['1 hour'] || 0),
        verified: Boolean(item.verified),
        age: item.age ? Number(item.age) : null,
        nationality: item.nationality || null,
        hair: item.hair || null,
        eyes: item.eyes || null,
        height: item.height || null,
        phone: item.phone || null,
        whatsappEnabled: true,
        telegramEnabled: false,
        serviceMode: normalizeServiceMode(item.serviceMode),
        bio: normalizeBio(item.descriptionParagraphs),
        email: null,
        passwordHash: null,
        planId: 'professional',
        planDuration: '1m',
        locations: normalizeLocations(item.location),
        locationType: normalizeLocationType(item.locationType),
        services: normalizeServices(item.services),
        rates: item.rates || {},
        gallery: normalizeGallery(item),
        videos: normalizeVideos(item.videos),
        trustBadges: Array.isArray(item.trustBadges) ? item.trustBadges : [],
      };

      await providerModel.createProvider(payload);
    }

    console.log('✅ Seed completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();