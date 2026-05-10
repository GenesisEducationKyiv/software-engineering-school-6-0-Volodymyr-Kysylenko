import { pool } from "../db/pool.js";
import { SubscriptionRepository } from "./subscription.repository.js";

export const subscriptionRepository: SubscriptionRepository = new SubscriptionRepository(pool);
