import { createWalletClient, http, parseUnits } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { base } from "viem/chains"

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

function parseMaxAmount(raw, x402Version) {
  const amount = raw.trim()
  if (amount.includes(".")) {
    return parseUnits(amount, 6)
  }
  if (x402Version >= 2 || amount.length > 6) {
    return BigInt(amount)
  }
  return parseUnits(amount, 6)
}

function parsePaymentRequired(headerValue) {
  let parsed = null

  try {
    parsed = JSON.parse(headerValue)
  } catch {
    try {
      const decoded = Buffer.from(headerValue, "base64").toString("utf-8")
      parsed = JSON.parse(decoded)
    } catch {
      return null
    }
  }

  if (!parsed || !Array.isArray(parsed.accepts) || parsed.accepts.length === 0) {
    return null
  }

  const requirement = parsed.accepts.find(r => r.scheme === "exact") || parsed.accepts[0]
  return {
    x402Version: parsed.x402Version || 1,
    requirement: {
      scheme: requirement.scheme,
      network: requirement.network,
      maxAmountRequired: String(requirement.maxAmountRequired),
      payToAddress: requirement.payToAddress || requirement.payTo,
      requiredDeadlineSeconds: requirement.requiredDeadlineSeconds || requirement.maxTimeoutSeconds || 300,
      usdcAddress: requirement.usdcAddress || requirement.asset || USDC_ADDRESS,
    },
  }
}

async function signPayment(account, requirement, x402Version) {
  const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}`
  const now = Math.floor(Date.now() / 1000)
  const validAfter = now - 60
  const validBefore = now + requirement.requiredDeadlineSeconds
  const amount = parseMaxAmount(requirement.maxAmountRequired, x402Version)

  const domain = {
    name: "USD Coin",
    version: "2",
    chainId: base.id,
    verifyingContract: requirement.usdcAddress,
  }

  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  }

  const message = {
    from: account.address,
    to: requirement.payToAddress,
    value: amount,
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBefore),
    nonce,
  }

  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: "TransferWithAuthorization",
    message,
  })

  return {
    x402Version,
    scheme: requirement.scheme,
    network: requirement.network,
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: requirement.payToAddress,
        value: amount.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  }
}

export async function x402Fetch(url, body, privateKey) {
  const account = privateKeyToAccount(privateKey)

  const initialResp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (initialResp.status !== 402) {
    const data = await initialResp.json().catch(() => initialResp.text())
    if (!initialResp.ok) {
      throw new Error(`Request failed (${initialResp.status}): ${JSON.stringify(data)}`)
    }
    return data
  }

  const paymentHeader = initialResp.headers.get("X-Payment-Required")
  let parsed = null

  if (paymentHeader) {
    parsed = parsePaymentRequired(paymentHeader)
  }

  if (!parsed) {
    const bodyText = await initialResp.text()
    parsed = parsePaymentRequired(bodyText)
  }

  if (!parsed) {
    throw new Error("Could not parse x402 payment requirements")
  }

  const payment = await signPayment(account, parsed.requirement, parsed.x402Version)
  const paymentEncoded = Buffer.from(JSON.stringify(payment)).toString("base64")

  const paidResp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment": paymentEncoded,
    },
    body: JSON.stringify(body),
  })

  const data = await paidResp.json().catch(() => paidResp.text())
  if (!paidResp.ok) {
    throw new Error(`Paid request failed (${paidResp.status}): ${JSON.stringify(data)}`)
  }
  return data
}
