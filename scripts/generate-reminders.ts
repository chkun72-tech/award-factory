import { opportunities } from "../src/data/seed";
import { generateServerReminders } from "../src/lib/serverReminders";
import { defaultSettings } from "../src/lib/repository";

const context = { userId: process.env.AWARD_FACTORY_USER_ID ?? "local-dev-user" };
const settings = defaultSettings(context);
const reminders = generateServerReminders({ context, opportunities, existing: [], settings });

console.log(JSON.stringify({
  status: "ok",
  provider: "local manual scheduler-compatible command",
  userId: context.userId,
  generatedReminderCount: reminders.length,
  reminders
}, null, 2));
