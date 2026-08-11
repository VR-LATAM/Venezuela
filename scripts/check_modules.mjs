import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const r = await client.query(`
  SELECT m.code, m.title, m.passing_score, m.total_questions,
         COUNT(q.id)::int AS preguntas
  FROM training_modules m
  LEFT JOIN training_questions q ON q.module_id = m.id
  GROUP BY m.id
  ORDER BY m.order_index
`);
r.rows.forEach(row =>
  console.log(
    row.code.padEnd(20),
    'score:', `${row.passing_score}/${row.total_questions}`,
    'preguntas:', row.preguntas,
    '|', row.title.substring(0, 45)
  )
);
await client.end();
