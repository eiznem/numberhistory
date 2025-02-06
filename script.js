document.getElementById('lookupForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const apiKey = document.getElementById('apiKey').value.trim();
    const phoneNumbers = document.getElementById('phoneNumbers').value
        .trim()
        .split(',')
        .map(num => num.replace(/\D/g, '').replace(/^1/, ''));

    document.getElementById('results').innerHTML = "⏳ Fetching data...";

    try {
        const accounts = await fetchAccounts(apiKey);
        let results = [];

        for (const account of accounts) {
            const campaigns = await fetchCampaigns(account.id, apiKey);

            for (const campaign of campaigns) {
                const campaignResults = await fetchCampaignResults(campaign.export);

                for (const result of campaignResults) {
                    const number = (result.number || result.phone_number || '').replace(/\D/g, '').replace(/^1/, '');

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

async function fetchAccounts(apiKey) {
    const response = await fetch('https://numberhistory.onrender.com/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: 'https://directdropvoicemail.voapps.com/api/v1/accounts',
            apiKey: apiKey
        })
    });

    const data = await response.json();
    return data.accounts || [];
}

async function fetchCampaigns(accountId, apiKey) {
    const response = await fetch(`https://directdropvoicemail.voapps.com/api/v1/accounts/${accountId}/campaigns`, {
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

    return rows.slice(1).map(row =>
        Object.fromEntries(headers.map((header, index) => [header, row[index]]))
    );
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');

    if (results.length === 0) {
        resultsContainer.innerHTML = "❌ No matches found.";
        return;
    }

    let table = `<table border="1" style="border-collapse: collapse; width: 100%;">
        <tr style="background-color: #3F2FB8; color: white;">
            <th>Number</th><th>Account ID</th><th>Campaign ID</th><th>Campaign Name</th>
            <th>Result</th><th>Code</th><th>Timestamp</th>
        </tr>`;

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
    resultsContainer.innerHTML = table;

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadCSV(results);
}

function downloadCSV(results) {
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
    document.body.removeChild(link);
}
