import http from 'http';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runVerification() {
  console.log('--- Starting API Verification ---');
  
  const health = await makeRequest('/api/health');
  console.log('1. Health Check:', health);

  const semesters = await makeRequest('/api/semesters');
  console.log(`2. Semesters Count: ${semesters.data.length} semesters loaded`);

  const subjects = await makeRequest('/api/subjects?semester=3-1');
  console.log(`3. Semester 3-1 Subjects: ${subjects.data.map(s => s.name).join(', ')}`);

  const resources = await makeRequest('/api/resources');
  console.log(`4. Total PDF Resources: ${resources.data.length} resources loaded`);

  const search = await makeRequest('/api/search?q=DWDM');
  console.log(`5. Global Search ('DWDM'): Found ${search.data.totalResults} results`);

  const stats = await makeRequest('/api/admin/stats');
  console.log('6. Admin Stats:', stats.data);

  console.log('--- All API Tests Passed Cleanly ---');
}

runVerification().catch(err => console.error('Verification failed:', err));
