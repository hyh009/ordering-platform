import mongooseDelete from 'mongoose-delete';

import type { Schema } from 'mongoose';

export function applySoftDeletePlugin(schema: Schema) {
  schema.plugin(mongooseDelete, {
    deletedAt: true,
    deletedBy: true,
    // Domain user IDs are strings such as `user-...`, not Mongo ObjectIds.
    deletedByType: String,
    indexFields: 'all',
    overrideMethods: 'all',
  });
}
