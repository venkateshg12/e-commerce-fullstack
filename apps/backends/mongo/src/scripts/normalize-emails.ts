// One-time migration: lowercase and trim every stored user email.
// Emails are now normalised on write and on lookup, so an account stored as "Foo@x.com" would no
// longer be found by login. Two accounts that differ only by case would collide on the unique
// index, so those are reported and left untouched for a person to resolve — never merged here.
// Works on the raw collection so it doesn't depend on the current Mongoose schema.
// Idempotent: a second run finds nothing left to convert.
//
//   pnpm --filter auth-service migrate:emails
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db";

async function main() {
    await connectDB();
    const users = mongoose.connection.collection("users");

    const all = await users.find({}, { projection: { email: 1 } }).toArray();

    const byNormalized = new Map<string, typeof all>();
    for (const user of all) {
        if (typeof user.email !== "string") continue;
        const normalized = user.email.trim().toLowerCase();
        byNormalized.set(normalized, [...(byNormalized.get(normalized) ?? []), user]);
    }

    let updated = 0;
    const collisions: Array<{ email: string; ids: string[] }> = [];

    for (const [normalized, group] of byNormalized) {
        if (group.length > 1) {
            collisions.push({ email: normalized, ids: group.map((user) => user._id.toString()) });
            continue;
        }

        const [user] = group;
        if (user.email !== normalized) {
            await users.updateOne({ _id: user._id }, { $set: { email: normalized } });
            updated++;
        }
    }

    console.log(`Emails normalised: ${updated}`);

    if (collisions.length > 0) {
        console.warn(`Skipped ${collisions.length} address(es) held by more than one account:`);
        for (const { email, ids } of collisions) {
            console.warn(`  ${email}  ->  ${ids.join(", ")}`);
        }
        process.exitCode = 1;
    }
}

main()
    .catch((error) => {
        console.error("Email normalisation failed:", error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
