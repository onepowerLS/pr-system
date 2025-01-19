const { cleanup } = require('./cleanup-legacy-collections');

async function main() {
    console.log('Starting final cleanup...');
    await cleanup();
    console.log('Cleanup complete!');
    process.exit(0);
}

main().catch(error => {
    console.error('Error during cleanup:', error);
    process.exit(1);
});
