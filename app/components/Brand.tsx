import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="TestBench home">
      <span className="brand-mark" aria-hidden="true">T</span>
      <span>TestBench</span>
    </Link>
  );
}
