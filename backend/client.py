import hashlib
import hmac

import requests
import time

from urllib.parse import urlencode


class BinanceTestClient:
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = 'https://testnet.binance.vision/api'

    def _generate_signature(self, query_string: str) -> str:
        return hmac.new(
            self.api_secret.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    def _execute_request(self, endpoint: str, params: dict, method: str = 'GET'):
        timestamp = int(time.time() * 1000)
        params['timestamp'] = timestamp

        query_string = urlencode(params)
        signature = self._generate_signature(query_string)
        params['signature'] = signature

        headers = {
            'X-MBX-APIKEY': self.api_key
        }
    
    

        if method == 'GET':
            return requests.get(f"{self.base_url}{endpoint}", params=params, headers=headers)

        return requests.post(f"{self.base_url}{endpoint}", params=params, headers=headers)
    def get_price(self, symbol: str):
        """
        Get current price of a symbol (public endpoint)
        """
        return requests.get(f"{self.base_url}/v3/ticker/price", params={"symbol": symbol})
    
    
    def get_klines(self, symbol: str, interval: str = '1h', limit: int = 100):
        """
        Get historical candlestick data (public endpoint)
        """
        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": limit
        }
        return requests.get(f"{self.base_url}/v3/klines", params=params)
