/**
 * Cloudflare Worker - Reverse Proxy for InfinityFree Backend
 * 
 * This worker transparently forwards all requests from the mobile app
 * to the InfinityFree server (kolkata-room.gamer.gd).
 * 
 * WHY: Indian mobile ISPs (Jio, Airtel, Vi) block *.gamer.gd domains
 * at the DNS level. By routing through Cloudflare Workers (*.workers.dev),
 * the app bypasses the ISP block completely.
 * 
 * The InfinityFree security challenge (AES cookie) is still handled
 * by the app's challengeSolver.ts — this worker just relays the traffic.
 * 
 * Deploy: https://dash.cloudflare.com → Workers & Pages → Create
 */

const TARGET_ORIGIN = 'https://kolkata-room.gamer.gd';
const TARGET_HOST = 'kolkata-room.gamer.gd';

export default {
  async fetch(request) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, Cache-Control, Pragma, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const url = new URL(request.url);
      const targetUrl = `${TARGET_ORIGIN}${url.pathname}${url.search}`;

      // Build headers to forward - preserve everything important
      const forwardHeaders = new Headers();
      
      // Copy relevant headers from the original request
      const headersToForward = [
        'content-type', 'accept', 'authorization', 'cookie',
        'cache-control', 'pragma', 'user-agent',
      ];

      for (const headerName of headersToForward) {
        const value = request.headers.get(headerName);
        if (value) {
          forwardHeaders.set(headerName, value);
        }
      }

      // Set the correct Host header for InfinityFree
      forwardHeaders.set('Host', TARGET_HOST);

      // Build fetch options
      const fetchOptions = {
        method: request.method,
        headers: forwardHeaders,
        redirect: 'manual', // Don't auto-follow redirects, let the app handle them
      };

      // Forward request body for POST/PUT/PATCH/DELETE
      if (!['GET', 'HEAD'].includes(request.method)) {
        fetchOptions.body = await request.text();
      }

      // Make the request to InfinityFree
      const response = await fetch(targetUrl, fetchOptions);

      // Read the response body
      const responseBody = await response.text();

      // Build response headers
      const responseHeaders = new Headers();
      
      // Copy content-type from the upstream response
      const contentType = response.headers.get('content-type');
      if (contentType) {
        responseHeaders.set('Content-Type', contentType);
      }

      // Copy Set-Cookie headers if any
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        responseHeaders.set('Set-Cookie', setCookie);
      }

      // Add CORS headers so the app can read the response
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
      responseHeaders.set('Access-Control-Expose-Headers', 'Set-Cookie');

      return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, message: 'Proxy error: ' + error.message }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
