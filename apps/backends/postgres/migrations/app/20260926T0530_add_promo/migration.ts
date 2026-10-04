#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6e2f06a524da5d7175b30665999648dcc52b826e6c1d1b0b3656c40b467d09da/contract';
import startContract from '../../snapshots/6e2f06a524da5d7175b30665999648dcc52b826e6c1d1b0b3656c40b467d09da/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e86a1c7f7f3b66bc97989b5b9ac16d888a8bac4de9030e0a5cb06876e6e1ef57/contract';
import endContract from '../../snapshots/e86a1c7f7f3b66bc97989b5b9ac16d888a8bac4de9030e0a5cb06876e6e1ef57/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'promo',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('endsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('minimumOrderValue', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('percentage', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('startsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('promo_count_min_857bca31', 'count >= 0'),
          checkExpression('promo_minimum_order_value_847d9933', '"minimumOrderValue" >= 0'),
          checkExpression(
            'promo_percentage_range_5e052d98',
            'percentage >= 1 AND percentage <= 100',
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'promo',
        constraint: 'promo_code_key',
        columns: ['code'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
