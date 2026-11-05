export const CERTBOT = `@@TERMIX@@CERTBOT

Found the following certs:
  Certificate Name: example.com
    Serial Number: 4a2b
    Key Type: ECDSA
    Domains: example.com www.example.com
    Expiry Date: 2026-12-01 10:00:00+00:00 (VALID: 27 days)
    Certificate Path: /etc/letsencrypt/live/example.com/fullchain.pem
    Private Key Path: /etc/letsencrypt/live/example.com/privkey.pem
  Certificate Name: test.example.com
    Key Type: RSA
    Domains: test.example.com
    Expiry Date: 2026-11-10 10:00:00+00:00 (INVALID: TEST_CERT)
    Certificate Path: /etc/letsencrypt/live/test.example.com/fullchain.pem
`;

export const ACME =
  "@@TERMIX@@ACME acme.example.org|www.acme.example.org|ec-256|Oct  1 10:00:00 2026 GMT|/root/.acme.sh/acme.example.org_ecc/acme.example.org.cer|https://acme-v02.api.letsencrypt.org/directory\n";

export const CHAIN = `@@TERMIX@@VERIFY 0 (ok)
@@TERMIX@@CERT
subject=CN = example.com
issuer=C = US, O = Let's Encrypt, CN = E5
notBefore=Sep  1 10:00:00 2026 GMT
notAfter=Dec  1 10:00:00 2026 GMT
serial=04AB
sha256 Fingerprint=AA:BB:CC
sans=DNS:example.com, DNS:www.example.com, IP Address:10.0.0.1
alg=id-ecPublicKey
bits=(256 bit)
@@TERMIX@@CERT
subject=C = US, O = Let's Encrypt, CN = E5
issuer=C = US, O = ISRG, CN = ISRG Root X1
notBefore=Mar 13 00:00:00 2024 GMT
notAfter=Mar 12 23:59:59 2027 GMT
serial=11
SHA256 Fingerprint=DD:EE
alg=rsaEncryption
bits=Public-Key: (2048 bit)
`;
