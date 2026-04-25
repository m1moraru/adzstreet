import bcrypt from 'bcrypt';
import providerModel from '../models/providerModel.js';

function parseJsonField(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function createProvider(req, res, next) {
  try {
    console.log('POST /api/providers hit');
    console.log('body:', req.body);
    console.log('files:', req.files);

    const body = req.body;

    const passwordHash = body.password
      ? await bcrypt.hash(body.password, 10)
      : null;

    const starredServices = parseJsonField(body.starredServices, []);
    const selectedServices = parseJsonField(body.selectedServices, []);
    const rates = parseJsonField(body.rates, {});
    const locations = parseJsonField(body.locations, []);
    const locationType = parseJsonField(body.locationType, []);

    const galleryFiles = req.files?.gallery || [];
    const videoFiles = req.files?.videos || [];

    const gallery = galleryFiles.map((file) => `/uploads/providers/${file.filename}`);
    const videos = videoFiles.map((file) => `/uploads/providers/${file.filename}`);

    const services = Array.isArray(selectedServices)
      ? selectedServices
          .filter((serviceName) => typeof serviceName === 'string' && serviceName.trim())
          .map((serviceName) => ({
            name: serviceName.trim(),
            isFeatured: starredServices.includes(serviceName),
          }))
      : [];

    const payload = {
      name: body.workingName?.trim(),
      profileTitle: body.profileTitle?.trim() || null,
      city: body.city?.trim(),
      country: body.country?.trim(),
      category: body.category?.trim() || 'Massage Therapist',
      price: parseOptionalNumber(rates?.['1 hour']) || 0,

      age: parseOptionalNumber(body.age),
      ageVerified: false,
      ageVerificationStatus: 'pending',
      ageVerifiedAt: null,
      isPublished: false,

      nationality: body.nationality?.trim() || null,
      hair: body.hair?.trim() || null,
      eyes: body.eyes?.trim() || null,
      height: body.height?.trim() || null,
      phone: body.phone?.trim() || null,
      whatsappEnabled: body.whatsappContact === 'true',
      telegramEnabled: body.telegramContact === 'true',
      serviceMode: body.serviceMode || 'in_call',
      bio: body.description?.trim() || null,
      email: body.email?.trim() || null,
      passwordHash,
      planId: body.planId || 'essential',
      planDuration: body.planDuration || '7d',
      paymentStatus: body.paymentStatus || 'pending',
      locations: Array.isArray(locations) ? locations.filter(Boolean).slice(0, 3) : [],
      locationType: Array.isArray(locationType) ? locationType.filter(Boolean) : [],
      services,
      rates,
      gallery,
      videos,
      trustBadges: ['New profile'],
    };

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Working name is required',
      });
    }

    if (!payload.country) {
      return res.status(400).json({
        success: false,
        message: 'Country is required',
      });
    }

    if (!payload.city) {
      return res.status(400).json({
        success: false,
        message: 'City is required',
      });
    }

    if (!body.termsAccepted || body.termsAccepted !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'You must accept the terms',
      });
    }

    const provider = await providerModel.createProvider(payload);

    return res.status(201).json({
      success: true,
      message: 'Provider created successfully. The ad will be published after age verification.',
      data: provider,
    });
  } catch (error) {
    if (error?.code === '23505') {
      if (error.constraint === 'providers_email_key') {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }

      if (error.constraint === 'providers_public_id_key') {
        return res.status(400).json({
          success: false,
          message: 'Could not generate a unique provider ID',
        });
      }
    }

    next(error);
  }
}

export async function getMyProvider(req, res, next) {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const provider = await providerModel.getProviderByInternalId(providerId);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMyProvider(req, res, next) {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const body = req.body;

    const starredServices = parseJsonField(body.starredServices, []);
    const selectedServices = parseJsonField(body.selectedServices, []);
    const rates = parseJsonField(body.rates, {});
    const locations = parseJsonField(body.locations, []);
    const locationType = parseJsonField(body.locationType, []);
    const existingGallery = parseJsonField(body.existingGallery, []);
    const existingVideos = parseJsonField(body.existingVideos, []);

    const galleryFiles = req.files?.gallery || [];
    const videoFiles = req.files?.videos || [];

    const newGallery = galleryFiles.map((file) => `/uploads/providers/${file.filename}`);
    const newVideos = videoFiles.map((file) => `/uploads/providers/${file.filename}`);

    const services = Array.isArray(selectedServices)
      ? selectedServices
          .filter((serviceName) => typeof serviceName === 'string' && serviceName.trim())
          .map((serviceName) => ({
            name: serviceName.trim(),
            isFeatured: starredServices.includes(serviceName),
          }))
      : [];

    const payload = {
      name: body.workingName?.trim(),
      profileTitle: body.profileTitle?.trim() || null,
      city: body.city?.trim(),
      country: body.country?.trim(),
      price: parseOptionalNumber(rates?.['1 hour']) || 0,
      age: parseOptionalNumber(body.age),
      nationality: body.nationality?.trim() || null,
      hair: body.hair?.trim() || null,
      eyes: body.eyes?.trim() || null,
      height: body.height?.trim() || null,
      phone: body.phone?.trim() || null,
      whatsappEnabled: body.whatsappContact === 'true',
      telegramEnabled: body.telegramContact === 'true',
      serviceMode: body.serviceMode || 'in_call',
      bio: body.description?.trim() || null,
      email: body.email?.trim() || null,
      planId: body.planId || 'essential',
      planDuration: body.planDuration || '7d',
      locations: Array.isArray(locations) ? locations.filter(Boolean).slice(0, 3) : [],
      locationType: Array.isArray(locationType) ? locationType.filter(Boolean) : [],
      services,
      rates,
      gallery: [...existingGallery, ...newGallery],
      videos: [...existingVideos, ...newVideos],
    };

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Working name is required',
      });
    }

    if (!payload.country) {
      return res.status(400).json({
        success: false,
        message: 'Country is required',
      });
    }

    if (!payload.city) {
      return res.status(400).json({
        success: false,
        message: 'City is required',
      });
    }

    const updatedProvider = await providerModel.updateProvider(providerId, payload);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProvider,
    });
  } catch (error) {
    if (error?.code === '23505' && error.constraint === 'providers_email_key') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    next(error);
  }
}

export async function updateMyPassword(req, res, next) {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const provider = await providerModel.getProviderPasswordHashById(providerId);

    if (!provider || !provider.password_hash) {
      return res.status(404).json({
        success: false,
        message: 'Provider password record not found',
      });
    }

    const matches = await bcrypt.compare(currentPassword, provider.password_hash);

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await providerModel.updateProviderPassword(providerId, passwordHash);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyProviderAge(req, res, next) {
  try {
    const { id } = req.params;

    const provider = await providerModel.verifyProviderAge(id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Provider age verified and published',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectProviderAge(req, res, next) {
  try {
    const { id } = req.params;

    const provider = await providerModel.rejectProviderAge(id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Provider age verification rejected',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProvidersForAdmin(req, res, next) {
  try {
    const status = req.query.status || '';

    const providers = await providerModel.getProvidersForAdmin({
      status: status || undefined,
    });

    return res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
}