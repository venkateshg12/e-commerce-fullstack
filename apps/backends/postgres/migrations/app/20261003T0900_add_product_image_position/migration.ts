#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2eface6fd5ec08df18ab97925dfb3ce74e782ad51eeb7439cb6627bcc0f55beb/contract';
import endContract from '../../snapshots/2eface6fd5ec08df18ab97925dfb3ce74e782ad51eeb7439cb6627bcc0f55beb/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5be93f7672e0777a2e1d6ddb10f217035722150b10b0b588f6e9ae0a11276b27/contract';
import startContract from '../../snapshots/5be93f7672e0777a2e1d6ddb10f217035722150b10b0b588f6e9ae0a11276b27/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'productImage',
        index: 'productImage_productId_idx_5858600a',
      }),
      this.addColumn({
        schema: 'public',
        table: 'productImage',
        column: col('position', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'productImage',
        index: 'productImage_productId_position_idx_902b1475',
        columns: ['productId', 'position'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
