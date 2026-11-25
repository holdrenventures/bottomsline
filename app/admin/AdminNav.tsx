type Tool = 'products' | 'orders' | 'designs';

const tools: Array<{ id: Tool; href: string; label: string }> = [
  { id: 'products', href: '/admin', label: 'Products' },
  { id: 'orders', href: '/admin/orders', label: 'Orders' },
  { id: 'designs', href: '/admin/designs', label: 'Designs' },
];

export default function AdminNav({ current }: { current: Tool }) {
  return <nav className="admin-tool-nav" aria-label="Admin tools">
    {tools.map((tool) => <a key={tool.id} href={tool.href} aria-current={current === tool.id ? 'page' : undefined}>{tool.label}</a>)}
  </nav>;
}
