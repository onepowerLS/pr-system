import seedReferenceData from './seedReferenceData';

const runSeed = async () => {
  try {
    await seedReferenceData();
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    process.exit();
  }
};

runSeed();
