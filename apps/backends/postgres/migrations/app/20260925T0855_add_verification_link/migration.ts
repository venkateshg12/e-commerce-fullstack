#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1be8a0ccf102401721c9cab3d26d37dda549df9be23a9969f0ed2e7e530ea655/contract';
import endContract from '../../snapshots/1be8a0ccf102401721c9cab3d26d37dda549df9be23a9969f0ed2e7e530ea655/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/de86a158b0368d37b676f77bf8e3a2f5e07249bf6ed17e1009bee8595b7078ca/contract';
import startContract from '../../snapshots/de86a158b0368d37b676f77bf8e3a2f5e07249bf6ed17e1009bee8595b7078ca/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'verificationLink',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('token', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'verificationLink',
        index: 'verificationLink_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'verificationLink',
        index: 'verificationLink_token_idx_8b25281e',
        columns: ['token'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
