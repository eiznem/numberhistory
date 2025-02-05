const PROXY_URL = 'https://voapps-cors-proxy.onrender.com/proxy';

async function fetchAccounts(apiKey) {
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://directdropvoicemail.voapps.com/api/v1/accounts',
        apiKey: apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`❌ Proxy Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Accounts fetched:", data);
    return data.accounts || [];
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    alert(`❌ Error: ${error.message}`);
    return [];
  }
}


document.getElementById('lookupForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const apiKey = document.getElementById('apiKey').value.trim();
    const phoneNumbers = document.getElementById('phoneNumbers').value.trim().split(',').map(num => num.replace(/\D/g, '').replace(/^1/, ''));

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const endDate = new Date();

    document.getElementById('results').innerHTML = "⏳ Fetching data...";

    try {
        const response = await fetch(`https://directdropvoicemail.voapps.com/api/v1/accounts`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const data = await response.json();
        const accounts = data.accounts || [];

        let results = [];
        for (const account of accounts) {
            const campaigns = await fetchCampaigns(account.id, apiKey, startDate, endDate);

            for (const campaign of campaigns) {
                const campaignResults = await fetchCampaignResults(campaign.export);

                for (const result of campaignResults) {
                    const number = result.number || result.phone_number || '';
                    if (phoneNumbers.includes(number)) {
                        results.push({
                            number,
                            account_id: account.id,
                            campaign_id: campaign.id,
                            campaign_name: campaign.name,
                            voapps_result: result.voapps_result || '',
                            voapps_code: result.voapps_code || '',
                            voapps_timestamp: result.voapps_timestamp || ''
                        });
                    }
                }
            }
        }

        displayResults(results);
    } catch (error) {
        document.getElementById('results').innerHTML = `❌ Error: ${error.message}`;
    }
});

async function fetchCampaigns(accountId, apiKey, startDate, endDate) {
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];

    const response = await fetch(`https://directdropvoicemail.voapps.com/api/v1/accounts/${accountId}/campaigns?created_date=${formattedStartDate}&end_date=${formattedEndDate}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    const data = await response.json();
    return data.campaigns || [];
}

async function fetchCampaignResults(exportUrl) {
    const response = await fetch(exportUrl);
    const text = await response.text();
    const rows = text.split('\n').map(row => row.split(','));
    const headers = rows[0];
    return rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}

function displayResults(results) {
    if (results.length === 0) {
        document.getElementById('results').innerHTML = "No matches found.";
        return;
    }

    let table = `<table><tr><th>Number</th><th>Account ID</th><th>Campaign ID</th><th>Campaign Name</th><th>Result</th><th>Code</th><th>Timestamp</th></tr>`;
    results.forEach(result => {
        table += `<tr>
                    <td>${result.number}</td>
                    <td>${result.account_id}</td>
                    <td>${result.campaign_id}</td>
                    <td>${result.campaign_name}</td>
                    <td>${result.voapps_result}</td>
                    <td>${result.voapps_code}</td>
                    <td>${result.voapps_timestamp}</td>
                  </tr>`;
    });
    table += `</table>`;

    document.getElementById('results').innerHTML = table;
    document.getElementById('downloadBtn').style.display = 'block';

    document.getElementById('downloadBtn').onclick = function () {
        const csvContent = "data:text/csv;charset=utf-8," + 
            ["number,account_id,campaign_id,campaign_name,voapps_result,voapps_code,voapps_timestamp"]
            .concat(results.map(r => `${r.number},${r.account_id},${r.campaign_id},${r.campaign_name},${r.voapps_result},${r.voapps_code},${r.voapps_timestamp}`))
            .join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "VoApps_Report.csv");
        document.body.appendChild(link);
        link.click();
    };
}
