const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname)));

const poolConfig = {
  host: '127.0.0.1',
  port: 54329,
  user: 'node',
  database: 'paperclip'
};

console.log('Pool config:', JSON.stringify(poolConfig, null, 2));
const pool = new Pool(poolConfig);

const COMPANY_ID = 'fc650af8-bed9-4da5-9050-1e4dff93a896';

app.get('/api/issues', async (req, res) => {
  try {
    console.log('Fetching issues for company:', COMPANY_ID);
    // Fetch issues
    const issuesResult = await pool.query(`
      SELECT id, title, status, parent_id, identifier, label_ids
      FROM issues
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [COMPANY_ID]);
    console.log('Found', issuesResult.rows.length, 'issues');

    // Fetch all labels for this company
    const labelsResult = await pool.query(`
      SELECT id, name, color
      FROM labels
      WHERE company_id = $1
    `, [COMPANY_ID]);

    // Create a labels map
    const labelsMap = {};
    labelsResult.rows.forEach(label => {
      labelsMap[label.id] = label;
    });

    // Attach labels to each issue
    const issues = issuesResult.rows.map(issue => ({
      ...issue,
      labels: (issue.label_ids || []).map(id => labelsMap[id]).filter(Boolean)
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
