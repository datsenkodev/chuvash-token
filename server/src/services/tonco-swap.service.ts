import { Address, beginCell, Cell, toNano } from '@ton/core'
import { internal } from '@ton/ton'
import { getSetting } from './settings.service.js'
import { getTonClient, getJettonWalletAddress, getOpenedServerWallet, parseTonAddress } from './ton.service.js'
import { getServerWalletAddress } from './wallet.service.js'
import type { SwapQuote } from './dedust.service.js'

const POOLV3_SWAP = 0xa7fb58f8
const TONPROXY_TON_TRANSFER = 0x1f3835d
const JETTON_TRANSFER = 0xf8a7ea5
const SWAP_GAS = toNano('0.4')
const FORWARD_GAS = toNano('0.2')
const DEFAULT_TONCO_ROUTER = 'EQC_-t0nCnOFMdp7E7qPxAOCbCWGFz-e3pwxb6tTvFmshjt5'

export interface ToncoExecPlan {
  venue: 'tonco'
  poolAddress: string
  amountInNano: bigint
  minOutNano: bigint
  zeroForOne: boolean
  swapType: 'ton_to_jetton' | 'jetton_to_jetton'
  inputJettonMaster: string | null
  outputJettonMaster: string
}

interface ToncoPoolState {
  jetton0Wallet: Address
  jetton1Wallet: Address
  jetton0Minter: Address
  jetton1Minter: Address
}

async function getToncoRouter(): Promise<Address> {
  const raw = String(await getSetting('tonco_router_address')) || DEFAULT_TONCO_ROUTER
  return Address.parse(raw)
}

async function resolvePool(currency: string, outNative = false): Promise<string> {
  if (currency === 'ton' || (currency === 'blc' && outNative)) {
    const pool =
      String(await getSetting('tonco_blc_ton_pool')) ||
      String(await getSetting('tonco_blc_pool_address'))
    if (!pool) throw new Error('tonco_blc_ton_pool not configured in admin')
    return pool
  }
  if (currency === 'usdt') {
    const pool = String(await getSetting('tonco_blc_usdt_pool'))
    if (!pool) throw new Error('tonco_blc_usdt_pool not configured in admin')
    return pool
  }
  throw new Error(`TonCo: no pool for ${currency}`)
}

async function readPoolState(poolAddress: string): Promise<ToncoPoolState> {
  const client = getTonClient()
  const pool = Address.parse(poolAddress)
  const res = await client.runMethod(pool, 'getPoolStateAndConfiguration')
  res.stack.readAddress()
  res.stack.readAddress()
  res.stack.readAddress()
  const jetton0Wallet = res.stack.readAddress()
  const jetton1Wallet = res.stack.readAddress()
  const jetton0Minter = res.stack.readAddress()
  const jetton1Minter = res.stack.readAddress()
  return { jetton0Wallet, jetton1Wallet, jetton0Minter, jetton1Minter }
}

function pickPoolDirection(state: ToncoPoolState, inputMinter: string, outputMinter: string) {
  const inAddr = parseTonAddress(inputMinter)
  const outAddr = outputMinter === 'native' ? state.jetton0Minter : parseTonAddress(outputMinter)
  if (state.jetton0Minter.equals(inAddr) && state.jetton1Minter.equals(outAddr)) {
    return { zeroForOne: true, routerOutWallet: state.jetton1Wallet, inputWallet: state.jetton0Wallet }
  }
  if (state.jetton1Minter.equals(inAddr) && state.jetton0Minter.equals(outAddr)) {
    return { zeroForOne: false, routerOutWallet: state.jetton0Wallet, inputWallet: state.jetton1Wallet }
  }
  throw new Error('TonCo pool jettons do not match swap pair')
}

async function estimateSwapOut(poolAddress: string, zeroForOne: boolean, amountIn: bigint): Promise<bigint> {
  const client = getTonClient()
  const pool = Address.parse(poolAddress)
  const res = await client.runMethod(pool, 'getSwapEstimate', [
    { type: 'int', value: zeroForOne ? 1n : 0n },
    { type: 'int', value: amountIn },
    { type: 'int', value: 0n },
  ])
  res.stack.readBigNumber()
  const out = res.stack.readBigNumber()
  return out < 0n ? -out : out
}

function buildSwapPayload(routerOutWallet: Address, minOut: bigint, recipient: Address): Cell {
  return beginCell()
    .storeUint(POOLV3_SWAP, 32)
    .storeAddress(routerOutWallet)
    .storeUint(0, 160)
    .storeCoins(minOut)
    .storeAddress(recipient)
    .storeBit(0)
    .endCell()
}

export async function getToncoSwapQuote(params: {
  currency: string
  amountNano: bigint
  swapMode?: 'exact_in' | 'exact_out'
  outMinter?: string
}): Promise<SwapQuote & { execPlan: ToncoExecPlan | null }> {
  const blcMaster = String(await getSetting('blc_jetton_master'))
  const usdtMaster = String(await getSetting('usdt_jetton_master'))
  const decimals = Number(await getSetting('blc_jetton_decimals')) || 9
  const slippageBps = Number(await getSetting('tonco_slippage_bps')) || 100

  if (!blcMaster) throw new Error('BLC jetton master not configured')

  const outNative = params.outMinter === 'native'
  const poolAddress = await resolvePool(params.currency, outNative)
  const state = await readPoolState(poolAddress)

  let inputMinter: string
  let outputMinter: string
  let swapType: ToncoExecPlan['swapType']

  if (params.currency === 'ton') {
    inputMinter = state.jetton0Minter.toString()
    outputMinter = blcMaster
    swapType = 'ton_to_jetton'
  } else if (params.currency === 'usdt') {
    if (!usdtMaster) throw new Error('USDT jetton master not configured')
    inputMinter = usdtMaster
    outputMinter = blcMaster
    swapType = 'jetton_to_jetton'
  } else if (params.currency === 'blc' && outNative) {
    inputMinter = blcMaster
    outputMinter = 'native'
    swapType = 'jetton_to_jetton'
  } else if (params.currency === 'blc') {
    const blc = Math.floor(Number(params.amountNano) / 10 ** decimals)
    return {
      inAmountNano: params.amountNano,
      outAmountNano: params.amountNano,
      outAmountBlc: blc,
      slippageBps,
      route: { source: 'tonco_direct' },
      swapData: null,
      execPlan: null,
    }
  } else {
    throw new Error(`TonCo: unsupported ${params.currency}`)
  }

  const { zeroForOne, routerOutWallet } = pickPoolDirection(state, inputMinter, outputMinter)
  const estimatedOut = await estimateSwapOut(poolAddress, zeroForOne, params.amountNano)
  const minOut = (estimatedOut * BigInt(10000 - slippageBps)) / 10000n
  const outAmountBlc = outNative ? 0 : Math.floor(Number(estimatedOut) / 10 ** decimals)

  const execPlan: ToncoExecPlan = {
    venue: 'tonco',
    poolAddress,
    amountInNano: params.amountNano,
    minOutNano: minOut,
    zeroForOne,
    swapType,
    inputJettonMaster: params.currency === 'ton' ? null : inputMinter,
    outputJettonMaster: outNative ? 'native' : outputMinter,
  }

  return {
    inAmountNano: params.amountNano,
    outAmountNano: estimatedOut,
    outAmountBlc,
    slippageBps,
    route: { source: 'tonco_pool', poolAddress, routerOutWallet: routerOutWallet.toString() },
    swapData: execPlan,
    execPlan,
  }
}

export async function executeToncoSwap(plan: ToncoExecPlan): Promise<void> {
  const serverAddr = await getServerWalletAddress()
  if (!serverAddr) throw new Error('Server wallet not ready')

  const recipient = parseTonAddress(serverAddr)
  const router = await getToncoRouter()
  const state = await readPoolState(plan.poolAddress)
  const outputMinter = plan.outputJettonMaster === 'native' ? 'native' : plan.outputJettonMaster
  const inputMinter = plan.inputJettonMaster ?? state.jetton0Minter.toString()
  const { routerOutWallet, inputWallet } = pickPoolDirection(state, inputMinter, outputMinter)

  const swapPayload = buildSwapPayload(routerOutWallet, plan.minOutNano, recipient)
  const { contract, keyPair } = await getOpenedServerWallet()
  const seqno = await contract.getSeqno()

  if (plan.swapType === 'ton_to_jetton') {
    const body = beginCell()
      .storeUint(TONPROXY_TON_TRANSFER, 32)
      .storeUint(0, 64)
      .storeCoins(plan.amountInNano)
      .storeAddress(recipient)
      .storeBit(1)
      .storeRef(swapPayload)
      .endCell()

    await contract.sendTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          to: inputWallet,
          value: plan.amountInNano + SWAP_GAS + FORWARD_GAS,
          body,
        }),
      ],
    })
    return
  }

  const userJettonWallet = await getJettonWalletAddress(plan.inputJettonMaster!, recipient)
  const jettonBody = beginCell()
    .storeUint(JETTON_TRANSFER, 32)
    .storeUint(0, 64)
    .storeCoins(plan.amountInNano)
    .storeAddress(router)
    .storeAddress(recipient)
    .storeBit(0)
    .storeCoins(SWAP_GAS)
    .storeBit(1)
    .storeRef(swapPayload)
    .endCell()

  await contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: userJettonWallet,
        value: SWAP_GAS + FORWARD_GAS,
        body: jettonBody,
      }),
    ],
  })
}
