import { readFileSync } from 'fs';
import { join } from 'path';

// Serve the existing index.html as raw HTML — no JSX conversion needed.
// Scripts, CSS and all existing behaviour work exactly as before.
export async function getServerSideProps({ res }) {
  const html = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf-8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.write(html);
  res.end();
  return { props: {} };
}

export default function Home() {
  return null;
}
