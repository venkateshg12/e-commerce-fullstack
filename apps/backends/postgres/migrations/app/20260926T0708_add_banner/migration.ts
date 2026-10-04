#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/f920e1dc88c45355118b1170bc7a38f0135add9a18ff308eab748324a04dd0e6/contract';
import endContract from '../../snapshots/f920e1dc88c45355118b1170bc7a38f0135add9a18ff308eab748324a04dd0e6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f9fed3c12aec2b838f872f2cad09421312c93d26b28d48931a427504ebdb1811/contract';
import startContract from '../../snapshots/f9fed3c12aec2b838f872f2cad09421312c93d26b28d48931a427504ebdb1811/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'banner',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('createdBy', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('imagePublicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('imageUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      // The order table is empty, so widening discountAmount int4 -> float8 needs no backfill.
      this.alterColumnType({
        schema: 'public',
        table: 'order',
        column: 'discountAmount',
        options: {
          qualifiedTargetType: 'float8',
          formatTypeExpected: 'double precision',
          rawTargetTypeForLabel: 'float8',
        },
      }),
      this.createIndex({
        schema: 'public',
        table: 'banner',
        index: 'banner_createdBy_idx_ba0f792f',
        columns: ['createdBy'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_cancelled_sweep_64021f13',
        columns: ['cancelledAt'],
        extras: { where: '("orderStatus" = \'cancelled\')' },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'banner',
        foreignKey: {
          name: 'banner_createdBy_fkey',
          columns: ['createdBy'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
