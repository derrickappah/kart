export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  
  if (!path) {
    return new Response('Invalid redirect configuration', { status: 400 });
  }

  // Collect all other query parameters (like orderId, reference, etc.)
  const params = new URLSearchParams(searchParams);
  params.delete('path');

  const deepLinkUrl = `kart-app://${path}?${params.toString()}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Completing Payment...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="2;url=${deepLinkUrl}">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0; 
            background-color: #f6f7f8; 
          }
          .container { 
            text-align: center; 
            padding: 24px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
            max-width: 90%;
            width: 320px;
          }
          .loader { 
            border: 4px solid #f3f3f3; 
            border-top: 4px solid #1daddd; 
            border-radius: 50%; 
            width: 48px; 
            height: 48px; 
            animation: spin 1s linear infinite; 
            margin: 0 auto 24px; 
          }
          @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
          }
          h2 {
            margin: 0 0 12px;
            color: #0e181b;
            font-size: 20px;
          }
          p {
            margin: 0;
            color: #4f8596;
            font-size: 15px;
            line-height: 1.5;
          }
          .help-text {
            font-size: 13px; 
            color: #7A818C; 
            margin-top: 32px;
            border-top: 1px solid #eee;
            padding-top: 16px;
          }
          a {
            color: #1daddd; 
            text-decoration: none; 
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="loader"></div>
          <h2>Completing Payment...</h2>
          <p>Please wait while we redirect you back to the KART app.</p>
          
          <div class="help-text">
            If nothing happens in a few seconds, <br/>
            <a href="${deepLinkUrl}" id="manual-link">click here to return</a>
          </div>
        </div>
        <script>
          // Client-side redirect triggers intent on Android Custom Tabs
          setTimeout(() => {
            window.location.href = "${deepLinkUrl}";
          }, 300);
        </script>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
