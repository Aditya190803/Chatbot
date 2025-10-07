import { Client, Databases, ID } from 'node-appwrite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from apps/web/.env
try {
    const envPath = resolve(process.cwd(), 'apps/web/.env');
    const envContent = readFileSync(envPath, 'utf-8');
    
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        }
    });
} catch (error) {
    // .env file might not exist yet, continue with existing env vars
}

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
};

const log = {
    info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg: string) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
};

async function setupAppwrite() {
    // Validate environment variables
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;

    if (!endpoint || !projectId || !apiKey) {
        log.error('Missing required environment variables:');
        if (!endpoint) log.error('  - APPWRITE_ENDPOINT');
        if (!projectId) log.error('  - APPWRITE_PROJECT_ID');
        if (!apiKey) log.error('  - APPWRITE_API_KEY');
        process.exit(1);
    }

    // Initialize Appwrite client
    const client = new Client();
    client.setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const databases = new Databases(client);

    log.info('Starting Appwrite setup...\n');

    try {
        // Step 1: Create Database
        log.info('Creating database...');
        const databaseId = ID.unique();
        
        try {
            const database = await databases.create(databaseId, 'chatbot-db');
            log.success(`Database created: ${database.name} (ID: ${database.$id})`);
        } catch (error: any) {
            if (error.code === 409) {
                log.warn('Database already exists, using existing one');
            } else {
                throw error;
            }
        }

        // Step 2: Create Collection
        log.info('\nCreating collection...');
        const collectionId = ID.unique();
        
        try {
            const collection = await databases.createCollection(
                databaseId,
                collectionId,
                'threads',
                undefined, // permissions - will use document-level
                true // documentSecurity
            );
            log.success(`Collection created: ${collection.name} (ID: ${collection.$id})`);
        } catch (error: any) {
            if (error.code === 409) {
                log.warn('Collection already exists, using existing one');
            } else {
                throw error;
            }
        }

        // Step 3: Create Attributes
        log.info('\nCreating attributes...');
        
        const attributes = [
            { key: 'threadId', type: 'string', size: 255, required: true },
            { key: 'userId', type: 'string', size: 255, required: true },
            { key: 'title', type: 'string', size: 500, required: true },
            { key: 'updatedAt', type: 'string', size: 50, required: true },
        ];

        for (const attr of attributes) {
            try {
                await databases.createStringAttribute(
                    databaseId,
                    collectionId,
                    attr.key,
                    attr.size,
                    attr.required
                );
                log.success(`  - Created attribute: ${attr.key}`);
            } catch (error: any) {
                if (error.code === 409) {
                    log.warn(`  - Attribute ${attr.key} already exists`);
                } else {
                    throw error;
                }
            }
        }

        // Create JSON attribute for payload
        try {
            await databases.createStringAttribute(
                databaseId,
                collectionId,
                'payload',
                1000000, // 1MB for JSON data
                true
            );
            log.success(`  - Created attribute: payload (JSON)`);
        } catch (error: any) {
            if (error.code === 409) {
                log.warn(`  - Attribute payload already exists`);
            } else {
                throw error;
            }
        }

        // Wait for attributes to be available
        log.info('\nWaiting for attributes to be ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 4: Create Indexes
        log.info('\nCreating indexes...');
        
        const indexes = [
            { key: 'userId_index', attributes: ['userId'], type: 'key' },
            { key: 'updatedAt_index', attributes: ['updatedAt'], type: 'key', orders: ['DESC'] },
        ];

        for (const index of indexes) {
            try {
                await databases.createIndex(
                    databaseId,
                    collectionId,
                    index.key,
                    index.type as any,
                    index.attributes,
                    index.orders as any
                );
                log.success(`  - Created index: ${index.key}`);
            } catch (error: any) {
                if (error.code === 409) {
                    log.warn(`  - Index ${index.key} already exists`);
                } else {
                    throw error;
                }
            }
        }

        // Step 5: Output environment variables
        log.info('\n' + '='.repeat(60));
        log.success('Setup complete! Add these to your .env file:\n');
        console.log(`APPWRITE_ENDPOINT=${endpoint}`);
        console.log(`APPWRITE_PROJECT_ID=${projectId}`);
        console.log(`APPWRITE_API_KEY=${apiKey}`);
        console.log(`APPWRITE_DATABASE_ID=${databaseId}`);
        console.log(`APPWRITE_THREADS_COLLECTION_ID=${collectionId}`);
        log.info('='.repeat(60) + '\n');

    } catch (error: any) {
        log.error('\nSetup failed:');
        log.error(error.message);
        if (error.response) {
            log.error(JSON.stringify(error.response, null, 2));
        }
        process.exit(1);
    }
}

// Run setup
setupAppwrite().catch(console.error);
