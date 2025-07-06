// functions/get-inventory.js
exports.handler = async function(event, context) {
    const machineId = process.env.MACHINE_ID;
    const apiToken = process.env.API_TOKEN;

    // Helper function to make authenticated API calls
    const fetchAPI = async (url) => {
        const response = await fetch(url, {
            headers: { 'Authorization': apiToken, 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        return response.json();
    };

    try {
        // 1. Fetch product details (for max capacity)
        const productsUrl = `https://cloud.vendon.net/rest/v1.7.0/products?machine_id=${machineId}&limit=200`;
        const productsData = await fetchAPI(productsUrl);
        
        const productDetails = {};
        if (productsData && productsData.result) {
            productsData.result.forEach(p => {
                productDetails[p.name] = {
                    amount_max: p.machine_defaults?.amount_max || null
                };
            });
        }

        // 2. Fetch inventory report (for current stock)
        const inventoryUrl = `https://cloud.vendon.net/rest/v1.7.0/stats/inventoryReport?machine_id=${machineId}`;
        const inventoryData = await fetchAPI(inventoryUrl);

        // 3. Merge the data
        const mergedData = inventoryData.result.map(item => {
            const details = productDetails[item.product_name];
            return {
                name: item.product_name,
                amount: item.amount,
                amount_max: details ? details.amount_max : null
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify(mergedData)
        };

    } catch (error) {
        console.error('Error in serverless function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
