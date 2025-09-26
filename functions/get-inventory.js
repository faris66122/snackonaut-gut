// functions/get-inventory.js
exports.handler = async function(event, context) {
    // Diese Header sind die Lösung für das CORS-Problem. Sie erlauben den Zugriff von jeder Webseite.
    // --> Diese Variable wird beibehalten.
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS' // Wichtig für manche Browser
    };

    // Hinzugefügt, um Preflight-Requests korrekt zu behandeln (Best Practice)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
        };
    }

    // Die Parameter- und Token-Logik wird beibehalten.
    const { machine_id } = event.queryStringParameters;
    const apiToken = process.env.API_TOKEN;

    // Die Prüfung auf eine machine_id wird beibehalten.
    if (!machine_id) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Keine machine_id übergeben.' })
        };
    }

    // === START DER ÄNDERUNG ===

    // Die alten, falschen URLs werden entfernt.
    // Stattdessen verwenden wir den einen, korrekten Endpunkt.
    const vendonApiUrl = `https://cloud.vendon.net/rest/head/machine/${machine_id}/products`;

    try {
        // Der komplexe "Promise.all"-Aufruf mit zwei Anfragen wird durch eine einzige,
        // gezielte Anfrage ersetzt.
        const response = await fetch(vendonApiUrl, {
            headers: { 'Authorization': apiToken } 
        });

        // Eine robustere Fehlerprüfung für die API-Antwort.
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API-Anfrage an Vendon fehlgeschlagen. Status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Die komplizierte Zusammenführung der Daten ("productInfoMap", "mergedData") ist nicht mehr nötig.
        // Wir können das Ergebnis direkt durchreichen, da es bereits korrekt gefiltert ist.
        const machineSpecificInventory = data.result || [];
        
        // Erfolgreiche Antwort mit den korrekten Daten.
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(machineSpecificInventory)
        };

    // === ENDE DER ÄNDERUNG ===

    } catch (error) {
        console.error('Fehler in der Netlify-Funktion:', error);
        // Die Fehlerbehandlung wird beibehalten, gibt jetzt aber spezifischere Fehler aus.
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message })
        };
    }
};
