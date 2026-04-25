import providerModel from '../models/providerModel.js';

export async function listProviders(req, res, next) {
  try {
    const providers = await providerModel.getAllProviders(req.query);
    res.json({ success: true, data: providers });
  } catch (error) {
    next(error);
  }
}

export async function getProvider(req, res, next) {
  try {
    const provider = await providerModel.getProviderByPublicId(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found',
      });
    }

    res.json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
}