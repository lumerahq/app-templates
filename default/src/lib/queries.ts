import { type PbRecord, pbList } from '@lumerahq/ui/lib';

export type ExampleRecord = PbRecord & {
  name: string;
  status: string;
};

export async function getExampleData() {
  // Replace with your actual data fetching logic
  return {
    message: 'Replace this with your data fetching logic',
    timestamp: new Date().toISOString(),
    instructions: [
      '1. Edit src/lib/queries.ts',
      '2. Use pbSql or pbList from @lumerahq/ui/lib',
      '3. Create query functions for your data',
    ],
  };
}

export async function listExampleRecords(page = 1) {
  return pbList<ExampleRecord>('your_collection', {
    page,
    perPage: 20,
    sort: '-created',
  });
}
