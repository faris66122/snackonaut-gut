// functions/get-inventory.js
exports.handler = async function(event, context) {
    const { machine_id } = event.queryStringParameters;
    const apiToken = process.env.API_TOKEN;

    if (!machine_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Keine machine_id übergeben.' }) };
    }

    const inventoryUrl = `https://cloud.vendon.net/rest/v1.7.0/stats/inventoryReport?machine_id=${machine_id}`;
    const productDataUrl = `https://cloud.vendon.net/rest/v1.7.0/stock?machine_id=${machine_id}`;

    try {
        // Frage beide Endpunkte gleichzeitig ab, um Zeit zu sparen
        const [inventoryResponse, productDataResponse] = await Promise.all([
            fetch(inventoryUrl, { headers: { 'Authorization': apiToken } }),
            fetch(productDataUrl, { headers: { 'Authorization': apiToken } })
        ]);

        if (!inventoryResponse.ok || !productDataResponse.ok) {
            throw new Error('API-Anfrage fehlgeschlagen.');
        }

        const inventoryData = await inventoryResponse.json();
        const productData = await productDataResponse.json();

        // 1. Erstelle eine Map mit den maximalen Kapazitäten für schnellen Zugriff
        const productInfoMap = new Map();
        if (productData && productData.result) {
            productData.result.forEach(p => {
                productInfoMap.set(p.name, {
                    amount_max: p.machine_defaults?.amount_max
                });
            });
        }
        
        // 2. Führe die Daten zusammen
        const mergedData = inventoryData.result.map(inventoryItem => {
            const productInfo = productInfoMap.get(inventoryItem.product_name);
            
            // Nimm den amount_max aus den Produktdaten. Wenn er dort nicht existiert,
            // nimm den (meist veralteten) Wert aus dem inventoryReport oder setze 10 als finalen Fallback.
            const final_amount_max = productInfo?.amount_max || inventoryItem.machine_defaults?.amount_max || 10;

            return {
                ...inventoryItem, // Übernehme alle Daten aus dem inventoryReport...
                machine_defaults: { // ...aber überschreibe die machine_defaults mit dem korrekten Maximalwert.
                    ...inventoryItem.machine_defaults,
                    amount_max: final_amount_max
                }
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify(mergedData)
        };

    } catch (error) {
        console.error('Fehler in der Netlify-Funktion:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
