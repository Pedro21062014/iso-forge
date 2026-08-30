#!/usr/bin/env node
import { run } from '../src/cli.js';

process.on('uncaughtException', (err) => {
  console.error('\n[iso-forge] Erro inesperado:', err?.message || err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('\n[iso-forge] Promessa rejeitada:', err?.message || err);
  process.exit(1);
});

run().catch((err) => {
  console.error('\n[iso-forge] Erro:', err?.message || err);
  process.exit(1);
});
