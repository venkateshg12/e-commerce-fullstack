#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2aa7647ad178efb9bb8b5983c321844faf2dfaaa02b982c0e615c8c20dd3c8fa/contract';
import endContract from '../../snapshots/2aa7647ad178efb9bb8b5983c321844faf2dfaaa02b982c0e615c8c20dd3c8fa/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/7082a3bea101c4152031b54a841209d1d30f732f8b7b850f7ea8902e0400ea1d/contract';
import startContract from '../../snapshots/7082a3bea101c4152031b54a841209d1d30f732f8b7b850f7ea8902e0400ea1d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
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
        table: 'orderItem',
        columns: [
          col('color', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('itemTotal', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('productId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('size', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('unitPrice', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'orderItem_size_check_f8fc34a7',
            "\"size\" IN ('S', 'M', 'L', 'XL', 'XXL')",
          ),
          checkExpression('order_item_quantity_min_2a0d32c1', 'quantity >= 1'),
          checkExpression('order_item_total_min_f42006c1', '"itemTotal" >= 0'),
          checkExpression('order_item_unit_price_min_07e3086a', '"unitPrice" >= 0'),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderItem',
        index: 'orderItem_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orderItem',
        index: 'orderItem_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orderItem',
        foreignKey: {
          name: 'orderItem_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'orderItem',
        foreignKey: {
          name: 'orderItem_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
