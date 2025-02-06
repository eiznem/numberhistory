document.getElementById('lookupForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const apiKey = document.getElementById('apiKey').value.trim();
    const phoneNumbers = document.getElementById('phoneNumbers').value
        .trim()
        .split(',')
        .map(num => num.replace(/\D/g, '').replace(/^1/, ''));

    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = "✅ Request submitted. Starting data retrieval...<br>";
    resultsContainer.scrollTop = resultsContainer.scrollHeight;

    try {
        const accounts = await fetchAccounts(apiKey);
        logMessage(`📊 Retrieved ${accounts.length} accounts.`, resultsContainer);

        let results = [];
        let totalCampaignsProcessed = 0;

        for (const account of accounts) {
            const campaigns = await fetchCampaigns(account.id, apiKey);
            logMessage(`🔍 Found ${campaigns.length} campaigns for account: ${account.name}`, resultsContainer);

            for (const campaign of campaigns) {
                totalCampaignsProcessed++;
                logMessage(`📦 Processing campaign: ${campaign.name}`, resultsContainer);

                const campaignResults = await fetchCampaignResults(campaign.export, apiKey);

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
                        logMessage(`✅ Match found for number: ${number}`, resultsContainer);
                    }
                }

                logMessage(`✅ Processed ${totalCampaignsProcessed} campaigns so far.`, resultsContainer);
            }
        }

        displayResults(results);
    } catch (error) {
        logMessage(`❌ Error: ${error.message}`, resultsContainer, true);
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
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const startDate = sixMonthsAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    let campaigns = [];

    // Fetch campaigns for each day in the date range
    for (let date = new Date(sixMonthsAgo); date <= today; date.setDate(date.getDate() + 1)) {
        const formattedDate = date.toISOString().split('T')[0];

        const response = await fetch('https://numberhistory.onrender.com/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: `https://directdropvoicemail.voapps.com/api/v1/accounts/${accountId}/campaigns?created_date=${formattedDate}`,
                apiKey: apiKey
            })
        });

        const data = await response.json();
        if (data.campaigns && data.campaigns.length) {
            campaigns = campaigns.concat(data.campaigns);
        }
    }

    return campaigns;
} 



    const data = await response.json();
    return data.campaigns || [];
}

async function fetchCampaignResults(exportUrl, apiKey) {
    const response = await fetch('https://numberhistory.onrender.com/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url: exportUrl,
            apiKey: apiKey
        })
    });

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
        logMessage("❌ No matches found.", resultsContainer, true);
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
    resultsContainer.innerHTML += table;

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

// ✅ Real-time Log Function
function logMessage(message, container, isError = false) {
    const logEntry = document.createElement('div');
    logEntry.style.color = isError ? 'red' : 'black';
    logEntry.innerHTML = message;
    container.appendChild(logEntry);
    container.scrollTop = container.scrollHeight; // Auto-scroll
}
