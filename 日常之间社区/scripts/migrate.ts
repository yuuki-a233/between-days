import {auth} from '../lib/auth.ts';
import {getMigrations} from 'better-auth/db/migration';
import {seedSamples} from '../lib/seed.ts';
const migration=await getMigrations(auth.options);await migration.runMigrations();
if(process.env.NODE_ENV!=='production')seedSamples();
console.log('Database ready.');

