#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0fbaf52eda32217af14277b4786db84e332dee86469cac71896509c36f7b0493/contract';
import endContract from '../../snapshots/0fbaf52eda32217af14277b4786db84e332dee86469cac71896509c36f7b0493/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/1be8a0ccf102401721c9cab3d26d37dda549df9be23a9969f0ed2e7e530ea655/contract';
import startContract from '../../snapshots/1be8a0ccf102401721c9cab3d26d37dda549df9be23a9969f0ed2e7e530ea655/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'category',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'subCategory',
        columns: [
          col('categoryId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'category',
        index: 'category_name_lower_e40b0be1',
        expression: 'lower(name)',
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'subCategory',
        index: 'subCategory_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'subCategory',
        index: 'sub_category_name_lower_0f7f2b6e',
        expression: '"categoryId", lower(name)',
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'subCategory',
        foreignKey: {
          name: 'subCategory_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'category', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
