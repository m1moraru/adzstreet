import Provider from "../models/providerModel.js";
import { createVerificationSession } from "../services/ageVerificationService.js";
import { sendProfessionalProviderEmail } from "../services/emailService.js";

export async function sendVerificationLink(req, res) {
  try {
    const providerId = req.params.id;
    const provider = await Provider.findById(providerId);

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    if (!provider.email) {
      return res.status(400).json({ message: "Provider has no email" });
    }

    if (provider.age_verified === true && provider.age_verification_status === "approved") {
      return res.status(400).json({ message: "Provider already verified" });
    }

    const session = await createVerificationSession(provider);

    await Provider.markAgeVerificationStarted(provider.id, {
      vendor: "stripe",
      sessionId: session.id,
      referenceId: provider.public_id,
    });

    console.log("Verification URL:", session.url);

    // await sendProfessionalProviderEmail({
    //   to: provider.email,
    //   providerName: provider.working_name || provider.name || "Provider",
    //   subject: "Complete your ID age verification",
    //   message: `Your ad has been received and requires ID age verification before it can be published.
    //
    // Please complete your verification using this secure link:
    //
    // ${session.url}`,
    // });

    return res.json({
      message: "Verification email sent",
      verificationStatus: "started",
    });
  } catch (error) {
    console.error("sendVerificationLink error:", error);
    return res.status(500).json({
      message: error.message || "Failed to send verification link",
    });
  }
}
