// functions/get-inventory.js
exports.handler = async function(event, context) {
    // Diese Header sind die Lösung für das CORS-Problem. Sie erlauben den Zugriff von jeder Webseite.
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    const { machine_id } = event.queryStringParameters;
    const apiToken = process.env.API_TOKEN;

    if (!machine_id) {
        return {
            statusCode: 400,
            headers: corsHeaders, // Header hier hinzufügen
            body: JSON.stringify({ error: 'Keine machine_id übergeben.' })
        };
    }

    const inventoryUrl = `https://cloud.vendon.net/rest/v1.7.0/stats/inventoryReport?machine_id=${machine_id}`;
    const productDataUrl = `https://cloud.vendon.net/rest/v1.7.0/stock?machine_id=${machine_id}`;

    try {
        const [inventoryResponse, productDataResponse] = await Promise.all([
            fetch(inventoryUrl, { headers: { 'Authorization': apiToken } }),
            fetch(productDataUrl, { headers: { 'Authorization': apiToken } })
        ]);

        if (!inventoryResponse.ok || !productDataResponse.ok) {
            throw new Error('API-Anfrage an Vendon fehlgeschlagen.');
        }

        const inventoryData = await inventoryResponse.json();
        const productData = await productDataResponse.json();

        const productInfoMap = new Map();
        if (productData && productData.result) {
            productData.result.forEach(p => {
                productInfoMap.set(p.name, {
                    amount_max: p.machine_defaults?.amount_max
                });
            });
        }
        
        const mergedData = inventoryData.result.map(inventoryItem => {
            const productInfo = productInfoMap.get(inventoryItem.product_name);
            const final_amount_max = productInfo?.amount_max || inventoryItem.machine_defaults?.amount_max || 10;

            return {
                ...inventoryItem,
                machine_defaults: {
                    ...inventoryItem.machine_defaults,
                    amount_max: final_amount_max
                }
            };
        });

        // Erfolgreiche Antwort
        return {
            statusCode: 200,
            headers: corsHeaders, // Header hier hinzufügen
            body: JSON.stringify(mergedData)
        };

    } catch (error) {
        console.error('Fehler in der Netlify-Funktion:', error);
        // Fehler-Antwort
        return {
            statusCode: 500,
            headers: corsHeaders, // Header hier hinzufügen
            body: JSON.stringify({ error: error.message })
        };
    }
};
