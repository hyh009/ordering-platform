import 'dotenv/config';
import { connectMongo } from '@src/config/db';
import { logger } from '@src/utils/logger';
import mongoose from 'mongoose';

import {
  seedAllergens,
  seedBreakfastLab,
  seedDietaryMarkers,
  seedOrganizations,
} from './seedData';

async function run() {
  try {
    await connectMongo();

    logger.info('Starting data seeding...');

    const allergensCount = await seedAllergens();
    logger.info(`Seeded ${allergensCount} allergens.`);

    const dietaryMarkersCount = await seedDietaryMarkers();
    logger.info(`Seeded ${dietaryMarkersCount} dietary markers.`);

    const orgsCount = await seedOrganizations(30);
    logger.info(`Seeded ${orgsCount} organizations.`);

    const breakfastLabCount = await seedBreakfastLab();
    logger.info(`Seeded ${breakfastLabCount} Breakfast Lab (早餐研究所) products.`);

    logger.info('Data seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Data seeding failed.');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

void run();
