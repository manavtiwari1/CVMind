import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// The worker shares the API's settings: auto-apply-agent/.env wins, then backend/.env fills the gaps
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: [path.join(root, '.env'), path.join(root, '../backend/.env')], quiet: true });
