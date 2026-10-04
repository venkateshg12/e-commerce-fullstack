#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2aa7647ad178efb9bb8b5983c321844faf2dfaaa02b982c0e615c8c20dd3c8fa/contract';
import startContract from '../../snapshots/2aa7647ad178efb9bb8b5983c321844faf2dfaaa02b982c0e615c8c20dd3c8fa/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/5be93f7672e0777a2e1d6ddb10f217035722150b10b0b588f6e9ae0a11276b27/contract';
import endContract from '../../snapshots/5be93f7672e0777a2e1d6ddb10f217035722150b10b0b588f6e9ae0a11276b27/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, createExtension, lit, rawSql } from '@prisma/orm-postgres/migration';

const TABLES_WITH_UPDATED_AT = [
  'user', 'category', 'subCategory', 'brand', 'product',
  'cart', 'wishlist', 'promo', 'order', 'banner',
];

// Not expressible in the contract: `@default(now())` only fires on insert, so a trigger keeps
// "updatedAt" honest on every UPDATE no matter which code path wrote the row.
const setUpdatedAtFunction = rawSql({
  id: 'function.public.set_updated_at',
  label: 'Create function "set_updated_at"',
  operationClass: 'additive',
  target: { id: 'postgres' },
  precheck: [],
  execute: [{
    description: 'Create function "set_updated_at"',
    sql: `CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$`,
  }],
  postcheck: [],
});

const setUpdatedAtTrigger = (table: string) => rawSql({
  id: `trigger.public.${table}.set_updated_at`,
  label: `Create trigger "${table}_set_updated_at"`,
  operationClass: 'additive',
  target: { id: 'postgres' },
  precheck: [],
  execute: [{
    description: `Create trigger "${table}_set_updated_at"`,
    sql: `CREATE OR REPLACE TRIGGER "${table}_set_updated_at" BEFORE UPDATE ON "public"."${table}" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"()`,
  }],
  postcheck: [],
});

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'orderItem',
        column: col('image', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orderItem',
        column: col('title', 'text', {
          notNull: true,
          default: lit(''),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      // float8 -> int4 is an assignment cast that rounds to the nearest integer, so no backfill step.
      this.alterColumnType({
        schema: 'public',
        table: 'product',
        column: 'salesPercentage',
        options: {
          qualifiedTargetType: 'int4',
          formatTypeExpected: 'integer',
          rawTargetTypeForLabel: 'int4',
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'promo',
        column: 'percentage',
        options: {
          qualifiedTargetType: 'int4',
          formatTypeExpected: 'integer',
          rawTargetTypeForLabel: 'int4',
        },
      }),
      this.createIndex({
        schema: 'public',
        table: 'address',
        index: 'address_one_default_8a30964e',
        columns: ['userId'],
        extras: { where: '"isDefault"', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'cartItem',
        index: 'cart_item_unique_312d3cd5',
        expression: '"cartId", "productId", coalesce(color, \'\'), coalesce(size, \'\')',
        extras: { unique: true },
      }),
      createExtension('pg_trgm'),
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_title_trgm_dbf5ca54',
        expression: 'title gin_trgm_ops',
        extras: { type: 'gin' },
      }),
      this.createIndex({
        schema: 'public',
        table: 'productImage',
        index: 'product_image_one_cover_f9da048c',
        columns: ['productId'],
        extras: { where: '"isCover"', unique: true },
      }),
      setUpdatedAtFunction,
      ...TABLES_WITH_UPDATED_AT.map(setUpdatedAtTrigger),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
