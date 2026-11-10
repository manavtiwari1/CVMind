// Classifies raw BSON values as returned by the MongoDB driver.
export function kindOf(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'bigint') return 'number';
  if (v instanceof Date) return 'date';
  if (Array.isArray(v)) return 'array';
  const bson = v._bsontype;
  if (bson === 'ObjectId' || bson === 'ObjectID') return 'objectId';
  if (bson === 'Binary' || Buffer.isBuffer(v)) return 'binary';
  if (bson === 'Decimal128') return 'decimal';
  if (bson === 'Long' || bson === 'Int32' || bson === 'Double') return 'number';
  if (bson === 'Timestamp') return 'date';
  if (bson === 'UUID') return 'string';
  if (typeof v === 'object') return 'object';
  return 'unknown';
}
