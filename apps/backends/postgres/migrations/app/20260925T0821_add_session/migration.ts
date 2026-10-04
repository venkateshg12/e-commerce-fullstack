#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8438c798e4f67542a8fee8866346cec58ee2895a0414ae52a80b63e06ef57203/contract';
import startContract from '../../snapshots/8438c798e4f67542a8fee8866346cec58ee2895a0414ae52a80b63e06ef57203/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/de86a158b0368d37b676f77bf8e3a2f5e07249bf6ed17e1009bee8595b7078ca/contract';
import endContract from '../../snapshots/de86a158b0368d37b676f77bf8e3a2f5e07249bf6ed17e1009bee8595b7078ca/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'session',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            default: fn("(CURRENT_TIMESTAMP + '30 days'::interval)"),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('prevRefreshJti', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refreshJti', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rotatedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('userAgent', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'session',
        index: 'session_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'session',
        index: 'session_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'session',
        foreignKey: {
          name: 'session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
