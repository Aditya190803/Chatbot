# Appwrite Database Setup

This guide explains how to automatically provision your Appwrite database for chat persistence.

## Prerequisites

1. **Appwrite Instance**: Cloud or self-hosted Appwrite
2. **Project Created**: Create a project in Appwrite console
3. **API Key**: Generate an API key with these scopes:
   - `databases.read`
   - `databases.write`

## Quick Setup

### 1. Set Environment Variables

Create a `.env` file in the project root (or add to your existing one):

```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id_here
APPWRITE_API_KEY=your_api_key_here
```

### 2. Run Setup Script

```bash
bun run setup-appwrite
```

The script will:
- ✓ Create a database named `llmchat`
- ✓ Create a collection named `threads`
- ✓ Add all required attributes (columns)
- ✓ Create indexes for performance
- ✓ Output the complete environment variables

### 3. Update Environment Variables

Copy the output from the script and add the new IDs to your `.env`:

```bash
APPWRITE_DATABASE_ID=your_generated_database_id
APPWRITE_THREADS_COLLECTION_ID=your_generated_collection_id
```

### 4. Restart Your App

```bash
bun run dev
```

## What Gets Created

### Database
- **Name**: `llmchat`
- **ID**: Auto-generated (saved to env)

### Collection (Table)
- **Name**: `threads`
- **ID**: Auto-generated (saved to env)
- **Document Security**: Enabled (user-level permissions)

### Attributes (Columns)
| Attribute | Type | Size | Required |
|-----------|------|------|----------|
| threadId | String | 255 | Yes |
| userId | String | 255 | Yes |
| title | String | 500 | Yes |
| updatedAt | String | 50 | Yes |
| payload | String (JSON) | 1MB | Yes |

### Indexes
- **userId_index**: For filtering threads by user
- **updatedAt_index**: For sorting by last update (DESC)

## Troubleshooting

### "Missing required environment variables"
Make sure you've set `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, and `APPWRITE_API_KEY` in your `.env` file.

### "Permission denied"
Your API key needs `databases.read` and `databases.write` scopes. Generate a new API key in Appwrite console with these permissions.

### "Database already exists"
The script safely handles existing resources. If you see warnings about existing items, that's normal—it will reuse them.

## Manual Setup (Alternative)

If you prefer to set up manually through the Appwrite console, follow the [manual setup guide](./docs/manual-appwrite-setup.md).

## Next Steps

Once setup is complete:
1. Authenticated users' chats will automatically sync to Appwrite
2. Guest users continue using local IndexedDB storage
3. Chat branching and history are preserved across devices
