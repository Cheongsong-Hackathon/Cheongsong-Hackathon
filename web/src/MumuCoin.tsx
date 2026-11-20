export function CoinIcon() {
  return <span className="mumu-coin-icon" aria-hidden="true">★</span>;
}

export default function MumuCoin({ balance = 0 }: { balance?: number }) {
  return <span className="mumu-coin">
    <CoinIcon />
    <span>무무코인</span>
    <strong>{balance.toLocaleString('ko-KR')}</strong>
  </span>;
}
