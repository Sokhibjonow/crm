// CommonJS re-export so this package works in any runtime (Vercel functions,
// Node ESM, plain Node). Vercel's serverless bundler only picks up .js from
// node_modules; pointing the package main at a .ts file made @vercel/node
// fail to find the module at runtime.
module.exports = require('@prisma/client');
