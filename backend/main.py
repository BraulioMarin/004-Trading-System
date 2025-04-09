from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

from dotenv import load_dotenv

from client import BinanceTestClient
from models import AccountInfo, OrderRequest, AssetBalance, PriceInfo, CandleInfo

load_dotenv('.env')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("BINANCE_API_KEY")
api_secret = os.getenv("BINANCE_API_SECRET")
client = BinanceTestClient(api_key, api_secret)


@app.get("/api/health")
async def health():
    return {"message": "OK"}


@app.get("/api/account")
async def get_account() -> AccountInfo:
    response = client._execute_request("/v3/account", {}, method="GET")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())

    data = response.json()
    balances = {b["asset"]: b for b in data["balances"]}

    def get_balance(asset: str) -> AssetBalance:
        b = balances.get(asset, {})
        return AssetBalance(asset=asset, balance=b.get("free", "0"))

    return AccountInfo(
        uid=data.get("accountId", 0),
        account_type=data.get("accountType", "SPOT"),
        btc_balance=get_balance("BTC"),
        eth_balance=get_balance("ETH"),
        usdt_balance=get_balance("USDT"),
    )


@app.get("/api/price")
async def get_price(symbol: str):
    """
    Get price of a symbol
    """
    response = client.get_price(symbol.upper())
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())
    return response.json()

@app.get("/api/price-history")
async def get_price(symbol: str, interval: str = '1h'):
    """
    Get historical candlestick price data
    """
    response = client.get_klines(symbol.upper(), interval)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())

    candles = response.json()
    return [
        {
            "open_time": c[0],
            "open": float(c[1]),
            "high": float(c[2]),
            "low": float(c[3]),
            "close": float(c[4]),
            "volume": float(c[5]),
            "close_time": c[6],
            "quote_asset_volume": float(c[7]),
            "number_of_trades": int(c[8]),
            "taker_buy_base_asset_volume": float(c[9]),
            "taker_buy_quote_asset_volume": float(c[10]),
            "ignore": c[11],
        }
        for c in candles
    ]



@app.post("/api/order")
async def create_order(order: OrderRequest):
    """
    Create a Binance order
    """

    endpoint = "/v3/order/test" if order.test else "/v3/order"
    params = {
        "symbol": order.symbol.upper(),
        "side": order.side.upper(),
        "type": order.order_type.upper(),
        "quantity": order.quantity,
    }

    response = client._execute_request(endpoint, params, method="POST")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())

    return response.json()

