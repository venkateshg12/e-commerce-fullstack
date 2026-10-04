#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7e597dd08fe41c5968d72abc11dcffe817459b4ec6e6aee64088fcd312e6e872/contract';
import endContract from '../../snapshots/7e597dd08fe41c5968d72abc11dcffe817459b4ec6e6aee64088fcd312e6e872/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('address', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('authProvider', 'text', {
            notNull: true,
            default: lit('local'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('avatar', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('googleId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('points', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('role', 'text', {
            notNull: true,
            default: lit('user'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('verified', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_authProvider_check_7916b13c',
            "\"authProvider\" IN ('local', 'google')",
          ),
          checkExpression('user_role_check_5b6d1a59', "\"role\" IN ('user', 'admin')"),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_googleId_key',
        columns: ['googleId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
