/**
 * @typedef {Object} RequestOptions
 * @prop {string} [method]
 * @prop {Record<string, any>} [query]
 * @prop {HeadersInit} [headers]
 * @prop {Record<string, any>} [body]
 */
/**
 * @param {string} endpoint 
 * @param {RequestOptions} options 
 */
async function request(endpoint, options) {
    const url = new URL(endpoint);
    if (options?.query) {
        for (const key in options.query) {
            url.searchParams.append(key, options.query[key]);
        }
    }
    const headers = new Headers(options?.headers);
    headers.set("accept", "application/json");
    let body;
    if (options?.body) {
        headers.set("content-type", "application/json");
        body = JSON.stringify(options?.body);
    }
    const response = await fetch(url, { method: options?.method, headers, body });
    if (response.ok) {
        return await response.json();
    } else {
        throw new Error(await response.text());
    }
}
const ws = new WebSocket("/");
ws.addEventListener("open", (event) => {
    console.log(event);
});

ws.addEventListener("message", async (event) => {
    console.log(await event.data.text());
});

ws.addEventListener("close", (event) => {
    console.log(event);
});