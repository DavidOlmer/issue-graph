const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 54329,
  user: 'node',
  database: process.env.DB_NAME || 'paperclip'
};

console.log('Pool config:', JSON.stringify(poolConfig, null, 2));
const pool = new Pool(poolConfig);

const COMPANY_ID = 'fc650af8-bed9-4da5-9050-1e4dff93a896';

app.get('/api/issues', async (req, res) => {
  try {
    // Fetch issues
    const issuesResult = await pool.query(`
      SELECT id, title, status, parent_id, identifier
      FROM issues
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [COMPANY_ID]);

    // Fetch issue labels with label details
    const labelsResult = await pool.query(`
      SELECT il.issue_id, l.id, l.name, l.color
      FROM issue_labels il
      JOIN labels l ON il.label_id = l.id
      WHERE il.company_id = $1
    `, [COMPANY_ID]);

    // Group labels by issue_id
    const issueLabelsMap = {};
    labelsResult.rows.forEach(row => {
      if (!issueLabelsMap[row.issue_id]) {
        issueLabelsMap[row.issue_id] = [];
      }
      issueLabelsMap[row.issue_id].push({
        id: row.id,
        name: row.name,
        color: row.color
      });
    });

    // Attach labels to each issue
    const issues = issuesResult.rows.map(issue => ({
      ...issue,
      labels: issueLabelsMap[issue.id] || []
    }));

    res.json(issues);
  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/issues/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM issues WHERE id = $1
    `, [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = 3202;
app.listen(PORT, () => {
  console.log(`Issue Graph running on http://localhost:${PORT}`);
});
