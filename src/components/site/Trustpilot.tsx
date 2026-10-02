import Script from "next/script";

/**
 * Trustpilot's invitation script (Automatic Feedback Service). It registers the
 * site with Trustpilot so review invitations can be sent - it does NOT display
 * reviews on the page. Showing reviews needs a TrustBox widget as well, which
 * requires the Business Unit ID from the Trustpilot dashboard.
 *
 * Loaded on the public marketing pages only - there's no reason to run
 * third-party script inside a client's private portal.
 */
export function Trustpilot() {
  if (!process.env.NEXT_PUBLIC_TRUSTPILOT_KEY) return null;

  return (
    <Script id="trustpilot-invite" strategy="afterInteractive">
      {`
        (function(w,d,s,r,n){w.TrustpilotObject=n;w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)};
          var a=d.createElement(s);a.async=1;a.src=r;a.type='text/java'+s;
          var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(a,f)})
          (window,document,'script','https://invitejs.trustpilot.com/tp.min.js','tp');
        tp('register', '${process.env.NEXT_PUBLIC_TRUSTPILOT_KEY}');
      `}
    </Script>
  );
}
