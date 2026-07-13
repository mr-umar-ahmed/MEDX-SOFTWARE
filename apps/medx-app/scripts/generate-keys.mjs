import { webcrypto } from "crypto";

async function generate() {
  const { subtle } = webcrypto;
  const keypair = await subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  const publicKey = await subtle.exportKey("jwk", keypair.publicKey);
  const privateKey = await subtle.exportKey("jwk", keypair.privateKey);

  console.log("=== PUBLIC KEY (JWK) ===");
  console.log(JSON.stringify(publicKey));
  console.log("\n=== PRIVATE KEY (JWK) ===");
  console.log(JSON.stringify(privateKey));
}

generate();
