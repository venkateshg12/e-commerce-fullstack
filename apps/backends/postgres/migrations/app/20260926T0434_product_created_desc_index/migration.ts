#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/77c844d0aee57ce784b2fb40ec85122942cb2b8f26f5d608be990da41de16ff4/contract';
import startContract from '../../snapshots/77c844d0aee57ce784b2fb40ec85122942cb2b8f26f5d608be990da41de16ff4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/afb1d72ec8fb959c84ef3fe368dcf9f109ed7beffe03060daa5517a417753ec1/contract';
import endContract from '../../snapshots/afb1d72ec8fb959c84ef3fe368dcf9f109ed7beffe03060daa5517a417753ec1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'product',
        index: 'product_status_createdAt_idx_58610442',
      }),
      this.createIndex({
        schema: 'public',
        table: 'product',
        index: 'product_status_created_desc_4696f21c',
        expression: 'status, "createdAt" DESC',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
