#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7e597dd08fe41c5968d72abc11dcffe817459b4ec6e6aee64088fcd312e6e872/contract';
import startContract from '../../snapshots/7e597dd08fe41c5968d72abc11dcffe817459b4ec6e6aee64088fcd312e6e872/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8438c798e4f67542a8fee8866346cec58ee2895a0414ae52a80b63e06ef57203/contract';
import endContract from '../../snapshots/8438c798e4f67542a8fee8866346cec58ee2895a0414ae52a80b63e06ef57203/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'user', column: 'address' }),
      this.createTable({
        schema: 'public',
        table: 'addressSchema',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('country', 'text', {
            notNull: true,
            default: lit('India'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isDefault', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('postalCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('state', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'addressSchema',
        index: 'addressSchema_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'addressSchema',
        foreignKey: {
          name: 'addressSchema_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
