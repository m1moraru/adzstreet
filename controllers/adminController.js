import adminModel from '../models/adminModel.js';
import providerModel from '../models/providerModel.js';
import { sendProfessionalProviderEmail } from '../services/emailService.js';

export async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminModel.getDashboardStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProviders(req, res, next) {
  try {
    const providers = await adminModel.getProviders(req.query);

    return res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProviderById(req, res, next) {
  try {
    const provider = await adminModel.getProviderById(req.params.id);

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

export async function getPendingProviders(req, res, next) {
  try {
    const providers = await adminModel.getPendingProviders();

    return res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyProvider(req, res, next) {
  try {
    const provider = await adminModel.verifyProviderAge(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Provider verified and published',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectProvider(req, res, next) {
  try {
    const provider = await adminModel.rejectProviderAge(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Provider rejected',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function publishAd(req, res, next) {
  try {
    const provider = await adminModel.publishAd(req.params.id);

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Could not publish ad',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ad published',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function unpublishAd(req, res, next) {
  try {
    const provider = await adminModel.unpublishAd(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ad unpublished',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function suspendAccount(req, res, next) {
  try {
    const provider = await adminModel.suspendAccount(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Provider account suspended',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function reactivateAccount(req, res, next) {
  try {
    const provider = await adminModel.reactivateAccount(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Provider account reactivated',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProvider(req, res, next) {
  try {
    const provider = await adminModel.deleteProvider(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Provider deleted',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMedia(req, res, next) {
  try {
    const media = await adminModel.deleteMedia(req.params.id, req.params.mediaId);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Media deleted',
      data: media,
    });
  } catch (error) {
    next(error);
  }
}


export async function emailProvider(req, res) {
  try {
    const providerId = req.params.id;
    const { subject, message } = req.body || {};

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ message: "Subject is required" });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (String(subject).trim().length > 200) {
      return res.status(400).json({ message: "Subject is too long" });
    }

    if (String(message).trim().length > 5000) {
      return res.status(400).json({ message: "Message is too long" });
    }

    const provider = await adminModel.getProviderById(providerId);

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    if (!provider.email) {
      return res
        .status(400)
        .json({ message: "Provider does not have an email address" });
    }

    await sendProfessionalProviderEmail({
      to: provider.email,
      providerName: provider.name,
      subject: String(subject).trim(),
      message: String(message).trim(),
    });

    return res.status(200).json({
      message: "Email sent successfully",
      data: {
        providerId: provider.id,
        email: provider.email,
      },
    });
  } catch (error) {
    console.error("emailProvider error:", error);
    return res.status(500).json({
      message: "Failed to send email",
    });
  }
}

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

export async function updateProvider(req, res, next) {
  try {
    const providerId = req.params.id;
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
      category: body.category?.trim() || 'Massage Therapist',
      price: parseOptionalNumber(rates?.['1 hour']) || 0,
      age: parseOptionalNumber(body.age),
      nationality: body.nationality?.trim() || null,
      hair: body.hair?.trim() || null,
      eyes: body.eyes?.trim() || null,
      height: body.height?.trim() || null,
      phone: body.phone?.trim() || null,
      whatsappEnabled: body.whatsappContact === 'true',
      telegramEnabled: body.telegramContact === 'true',
      telegramUsername: body.telegramUsername?.replace("@", "").trim() || null,
      serviceMode: body.serviceMode || 'in_call',
      bio: body.description?.trim() || null,
      email: body.email?.trim() || null,
      planId: body.planId || 'essential',
      planDuration: body.planDuration || '7d',
      paymentStatus: body.paymentStatus || 'pending',
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

    if (body.telegramContact === 'true' && !body.telegramUsername?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Telegram username is required when Telegram contact is enabled',
      });
    }

    const updatedProvider = await providerModel.updateProvider(providerId, payload);

    if (!updatedProvider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Provider updated successfully',
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