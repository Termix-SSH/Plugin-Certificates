<div align="center">

<img src="https://termix.site/img/logo.svg" width="120" alt="Termix Logo" />

<h1>Certificates</h1>

<p>See, issue and renew TLS certificates on your hosts with certbot and acme.sh, and get an alert before they expire</p>

</div>

<br />

## Overview

Certificates manages the TLS certificates on your hosts over SSH. Each host gets its own tab for certbot and acme.sh certificates, a certificate inspector and the renewal setup.

Read the [docs](https://docs.termix.site/plugins/certificates) to set it up and use it.

<br />

## Features

- See every certbot and acme.sh certificate on a host with its days left
- Issue certificates with the standalone, web root or DNS challenge
- Renew one or all certificates, with a dry run for certbot
- Revoke or stop managing a certificate
- Read any certificate file, or check what a server sends over TLS
- See how automatic renewal is set up
- Get an alert before a certificate expires
- A dashboard card with the certificates that expire next and a Certificates card in Host Metrics
- Renew and revoke through Termix actions, with expiring certificates as a status tile

<br />

## Sponsors

For a paid sponsor spot, email [mail@termix.site](mailto:mail@termix.site).

<!-- SPONSORS:START -->

<div align="center">

<br />

<a href="https://www.blacksmith.sh/">
  <img src="https://termix.site/img/sponsors/blacksmith.svg" height="40" alt="Blacksmith" />
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://www.cloudflare.com/">
  <img src="https://termix.site/img/sponsors/cloudflare.png" height="40" alt="Cloudflare" />
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://akamai.com/">
  <img src="https://termix.site/img/sponsors/akamai.svg" height="40" alt="Akamai" />
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://aws.amazon.com/">
  <img src="https://termix.site/img/sponsors/aws.png" height="40" alt="AWS" />
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://rackgenius.com/">
  <img src="https://termix.site/img/sponsors/rackgenius.png" height="40" alt="Rack Genius" />
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://ginernet.com/">
  <img src="https://termix.site/img/sponsors/ginernet.png" height="40" alt="Ginernet" />
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://www.hetzner.com/?mtm_campaign=termix&mtm_medium=referral&mtm_content=sponsoring_link">
  <img src="https://termix.site/img/sponsors/hetzner.png" height="40" alt="Hetzner" />
</a>

</div>

<!-- SPONSORS:END -->

<br />

## Support

Bugs and ideas for Certificates go in this repo: [report a bug](https://github.com/Termix-SSH/Plugin-Certificates/issues/new?template=bug_report.yml) or [request a feature](https://github.com/Termix-SSH/Plugin-Certificates/issues/new?template=feature_request.yml). Report an issue on the plugin's page in the Plugins tab fills in your versions for you.

Problems with Termix itself (login, hosts, credentials, sharing, sync) go in the [Termix repo](https://github.com/Termix-SSH/Termix/issues/new/choose). Not sure where it goes? Open it there and it will be moved.

Add as much detail as you can, in English if possible. For questions, join the [Discord](https://discord.gg/jVQGdvHDrf) server.

<br />

## License

Apache License 2.0. See [LICENSE](LICENSE).
