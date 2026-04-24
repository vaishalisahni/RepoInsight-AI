/**
 * TechStackBadge.jsx
 * Renders a colored pill badge for each detected framework/library.
 */

// Simple icon fallbacks using text abbreviations
const ABBR = {
  'React':          'Re',
  'Vue.js':         'Vu',
  'Next.js':        'Nx',
  'Nuxt.js':        'Nu',
  'Svelte':         'Sv',
  'SvelteKit':      'SK',
  'Angular':        'Ng',
  'Express':        'Ex',
  'Fastify':        'Fy',
  'NestJS':         'Ne',
  'Django':         'Dj',
  'Flask':          'Fl',
  'FastAPI':        'FA',
  'Gin':            'Gi',
  'Fiber':          'Fb',
  'Actix Web':      'Ax',
  'Rocket':         'Ro',
  'Ruby on Rails':  'RR',
  'Laravel':        'La',
  'Spring Boot':    'Sp',
  'MongoDB/Mongoose':'Mo',
  'PostgreSQL':     'Pg',
  'MySQL':          'My',
  'Prisma':         'Pr',
  'TypeORM':        'TO',
  'Drizzle ORM':    'Dr',
  'Redis':          'Re',
  'Vite':           'Vi',
  'Webpack':        'Wp',
  'Tailwind CSS':   'Tw',
  'GraphQL':        'GQ',
  'tRPC':           'TR',
  'Docker':         'Dk',
  'Kubernetes':     'K8',
  'Terraform':      'Tf',
  'Flutter/Dart':   'Fl',
  'Frappe App':     'Fr',
  'Frappe Framework':'Fr',
  'Frappe/ERPNext': 'FE',
  'Elixir/Mix':     'El',
};

const CATEGORY_LABELS = {
  frontend:   'Frontend',
  backend:    'Backend',
  fullstack:  'Full-stack',
  database:   'Database',
  build:      'Build',
  testing:    'Testing',
  styling:    'Styling',
  state:      'State',
  api:        'API',
  realtime:   'Realtime',
  validation: 'Validation',
  infra:      'Infra',
  ci:         'CI/CD',
  mobile:     'Mobile',
  ml:         'ML/AI',
  data:       'Data',
  queue:      'Queue',
  scraping:   'Scraping',
  async:      'Async',
  serde:      'Serialization',
  native:     'Native',
  ios:        'iOS',
};

export default function TechStackBadge({ framework }) {
  if (!framework?.name) return null;

  const { name, color = '#5c5be8', category } = framework;
  const abbr  = ABBR[name] || name.slice(0, 2).toUpperCase();
  const label = CATEGORY_LABELS[category] || category || '';

  // Make a slightly transparent version of the color for background
  const bg    = `${color}22`;
  const border= `${color}44`;

  return (
    <span
      title={`${name}${label ? ` · ${label}` : ''}`}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap transition-all hover:opacity-90 cursor-default select-none"
      style={{ background: bg, border: `1px solid ${border}`, color }}
    >
      {/* Color dot + abbr */}
      <span
        className="w-4 h-4 rounded-sm flex items-center justify-center text-[8px] font-bold text-white"
        style={{ background: color }}
      >
        {abbr}
      </span>
      {name}
      {label && (
        <span
          className="text-[9px] px-1 py-0.5 rounded font-normal"
          style={{ background: `${color}33`, color: `${color}cc` }}
        >
          {label}
        </span>
      )}
    </span>
  );
}