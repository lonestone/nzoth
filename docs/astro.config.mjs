// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
    site: 'https://lonestone.github.io',
    base: '/nzoth',
	integrations: [
    
		starlight({
			title: 'NZOTH',
			tagline: 'Nest + Zod + OpenAPI + Typed + Helpers',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/lonestone/nzoth' }],
            expressiveCode: {
                themes: ["github-light", "github-dark"],
            },
			sidebar: [
				{ label: 'Introduction', link: '/' },
				{ label: 'Getting Started', link: '/getting-started/' },
				{
					label: 'Core',
					items: [
						{ label: 'Validation', link: '/core/validation/' },
						{ label: 'Filtering', link: '/core/filtering/' },
						{ label: 'Pagination', link: '/core/pagination/' },
						{ label: 'Sorting', link: '/core/sorting/' },
						{ label: 'OpenAPI', link: '/core/openapi/' },
					],
				},
			],
		}),
	],
});
