import { NeonPostgrestClient } from '@neon/postgrest-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import { PostgrestParser } from '@supabase-cache-helpers/postgrest-core';
const API = process.env.NEON_DATA_API_URL ?? 'https://example.invalid/rest/v1'; // parsing only, no request is made
const build = (c) =>
  c
    .from('tasks')
    .select(
      `*, category:categories(id, name, color, icon), subtasks:tasks!parent_task_id(id, title, is_completed, position)`
    )
    .eq('scheduled_date', '2026-11-04')
    .is('parent_task_id', null)
    .order('position', { ascending: true });
const strip = (p) =>
  JSON.stringify({
    table: p.table,
    schema: p.schema,
    queryKey: p.queryKey,
    paths: p.paths,
    filters: p.filters,
    order: p.orderByKey,
    count: p.count,
    isHead: p.isHead,
  });
const neon = new PostgrestParser(
  build(new NeonPostgrestClient({ dataApiUrl: API }))
);
const supa = new PostgrestParser(build(new PostgrestClient(API)));
console.log('identical parse:', strip(neon) === strip(supa));
console.log(neon.paths.slice(0, 3));
