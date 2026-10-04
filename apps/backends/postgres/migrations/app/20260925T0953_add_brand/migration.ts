#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0fbaf52eda32217af14277b4786db84e332dee86469cac71896509c36f7b0493/contract';
import startContract from '../../snapshots/0fbaf52eda32217af14277b4786db84e332dee86469cac71896509c36f7b0493/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/54e458ace6b116150d56f24344d03318dfc6746ae5ea0541d72db660eeadfa59/contract';
import endContract from '../../snapshots/54e458ace6b116150d56f24344d03318dfc6746ae5ea0541d72db660eeadfa59/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'brand',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'brand',
        index: 'brand_name_lower_e40b0be1',
        expression: 'lower(name)',
        extras: { unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
