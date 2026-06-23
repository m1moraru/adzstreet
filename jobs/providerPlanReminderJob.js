import cron from "node-cron";
import providerModel from "../models/providerModel.js";
import { sendEmail } from "../utils/email.js";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function sendExpiryEmail(provider, reminderType) {
  const expiryDate = formatDate(provider.plan_expires_at);

  await sendEmail({
    to: provider.email,
    subject: "Your AdzStreet listing plan is due to expire",
    text: `Hi ${provider.name},

Your ${provider.plan_id} plan is due to expire on ${expiryDate}.

Please log in to your AdzStreet account to renew or change your plan.

AdzStreet`,
    html: `
      <p>Hi ${provider.name},</p>
      <p>Your <strong>${provider.plan_id}</strong> plan is due to expire on <strong>${expiryDate}</strong>.</p>
      <p>Please log in to your AdzStreet account to renew or change your plan.</p>
      <p>AdzStreet</p>
    `,
  });
}

async function sendReminders(reminderType, daysBefore, planType = "paid") {
  const providers = await providerModel.getProvidersExpiringForReminder({
    daysBefore,
    reminderType,
    planType,
  });

  for (const provider of providers) {
    await sendExpiryEmail(provider, reminderType);

    await providerModel.markPlanReminderSent(provider.id, reminderType);
  }

  console.log(
    `Provider plan reminder ${reminderType}: ${providers.length} sent`
  );
}

export function startProviderPlanReminderJob() {
  cron.schedule("0 9 * * *", async () => {
    try {
      await sendReminders("paid_14_days", 14, "paid");
      await sendReminders("paid_7_days", 7, "paid");
      await sendReminders("paid_1_day", 1, "paid");
      await sendReminders("paid_expiry_day", 0, "paid");

      await sendReminders("essential_30_days", 30, "essential");
    } catch (error) {
      console.error("Provider plan reminder job failed:", error);
    }
  });
}