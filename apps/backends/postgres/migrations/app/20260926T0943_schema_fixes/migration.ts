#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7082a3bea101c4152031b54a841209d1d30f732f8b7b850f7ea8902e0400ea1d/contract';
import endContract from '../../snapshots/7082a3bea101c4152031b54a841209d1d30f732f8b7b850f7ea8902e0400ea1d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f920e1dc88c45355118b1170bc7a38f0135add9a18ff308eab748324a04dd0e6/contract';
import startContract from '../../snapshots/f920e1dc88c45355118b1170bc7a38f0135add9a18ff308eab748324a04dd0e6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    // product, order and promo are empty (checked on Neon), so the money column type changes need no backfill.
    return [
      this.dropTable({ schema: 'public', table: 'orderItem' }),
      this.dropIndex({
        schema: 'public',
        table: 'verificationLink',
        index: 'verificationLink_token_idx_8b25281e',
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'order',
        column: 'discountAmount',
        options: {
          qualifiedTargetType: 'int4',
          formatTypeExpected: 'integer',
          rawTargetTypeForLabel: 'int4',
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'order',
        column: 'totalAmount',
        options: {
          qualifiedTargetType: 'int4',
          formatTypeExpected: 'integer',
          rawTargetTypeForLabel: 'int4',
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'product',
        column: 'price',
        options: {
          qualifiedTargetType: 'int4',
          formatTypeExpected: 'integer',
          rawTargetTypeForLabel: 'int4',
        },
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'promo',
        column: 'minimumOrderValue',
        options: {
          qualifiedTargetType: 'int4',
          formatTypeExpected: 'integer',
          rawTargetTypeForLabel: 'int4',
        },
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'verificationLink',
        constraint: 'verificationLink_type_check_c88c716f',
        expression: "\"type\" IN ('email_verification', 'password_reset')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'verificationLink',
        constraint: 'verificationLink_token_key',
        columns: ['token'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_colors_gin_708d437b',
        columns: ['colors'],
        extras: { type: 'gin' },
      }),
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_sizes_gin_f1a51111',
        columns: ['sizes'],
        extras: { type: 'gin' },
      }),
      this.createIndex({
        schema: 'public',
        table: 'productVariant',
        index: 'product_variant_unique_04a28d33',
        expression: "\"productId\", coalesce(color, ''), coalesce(size, '')",
        extras: { unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
