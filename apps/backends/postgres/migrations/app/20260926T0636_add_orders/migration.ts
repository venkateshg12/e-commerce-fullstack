#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/e86a1c7f7f3b66bc97989b5b9ac16d888a8bac4de9030e0a5cb06876e6e1ef57/contract';
import startContract from '../../snapshots/e86a1c7f7f3b66bc97989b5b9ac16d888a8bac4de9030e0a5cb06876e6e1ef57/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f9fed3c12aec2b838f872f2cad09421312c93d26b28d48931a427504ebdb1811/contract';
import endContract from '../../snapshots/f9fed3c12aec2b838f872f2cad09421312c93d26b28d48931a427504ebdb1811/contract.json' with { type: 'json' };
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
        table: 'order',
        columns: [
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('cancelledBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerEmail', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('customerName', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('deliveredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('deliveryAddress', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('deliveryName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('discountAmount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('orderStatus', 'text', {
            notNull: true,
            default: lit('pending_payment'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('paidAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('paymentId', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('paymentStatus', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('promoCode', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('razorpayOrderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('returnedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('shippedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('totalAmount', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('totalItems', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'order_cancelledBy_check_2cc69f64',
            "\"cancelledBy\" IN ('customer', 'admin')",
          ),
          checkExpression('order_discount_amount_min_f2689c28', '"discountAmount" >= 0'),
          checkExpression(
            'order_orderStatus_check_a252a221',
            "\"orderStatus\" IN ('pending_payment', 'placed', 'shipped', 'delivered', 'returned', 'cancelled')",
          ),
          checkExpression(
            'order_paymentStatus_check_ad13dc0d',
            "\"paymentStatus\" IN ('pending', 'paid', 'failed')",
          ),
          checkExpression(
            'order_promo_code_uppercase_fafa66df',
            '"promoCode" = upper(btrim("promoCode"))',
          ),
          checkExpression('order_total_amount_min_a0230a06', '"totalAmount" >= 0'),
          checkExpression('order_total_item_min_f8d723e1', '"totalItems" >= 1'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'orderItem',
        columns: [
          col('color', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('itemTotal', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('orderId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('productId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('size', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('unitPrice', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
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
      this.addUnique({
        schema: 'public',
        table: 'order',
        constraint: 'order_razorpayOrderId_key',
        columns: ['razorpayOrderId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'promo',
        constraint: 'promo_code_uppercase_trimmed_099b454a',
        expression: 'code = upper(btrim(code))',
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_orderStatus_createdAt_ffff26ab',
        expression: '"orderStatus", "createdAt" DESC',
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_paymentStatus_createdAt_8dac5b5c',
        expression: '"paymentStatus", "createdAt" DESC',
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_userId_createdAt_0ea562f9',
        expression: '"userId", "createdAt" DESC',
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_userId_idx_a489d58a',
        columns: ['userId'],
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
        table: 'order',
        foreignKey: {
          name: 'order_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
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
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
