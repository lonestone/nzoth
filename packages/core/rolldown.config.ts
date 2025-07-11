import { defineConfig } from 'rolldown';
import { dts } from 'rolldown-plugin-dts'
import pkg from './package.json';

const external = [
    ...Object.keys(pkg.dependencies || {}),
];

const commonClient = defineConfig({
    input: 'src/client.ts',
    external
})

const commonServer = defineConfig({
    input: 'src/server.ts',
    external
})

const commonEsm = defineConfig({
    output: {
        dir: 'dist/esm',
        format: 'esm',
        sourcemap: true,
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        minify: true,
    }
})

const commonCjs = defineConfig({
    output: {
        dir: 'dist/cjs',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        minify: true,
    }
    
})

export default defineConfig([
    {
        ...commonServer,
        ...commonEsm,
        plugins: [dts()],
    },
    {
        ...commonClient,
        ...commonEsm,
        plugins: [dts()],
    },
    {
        ...commonServer,
        ...commonCjs,
        plugins: [],
    },
    {
        ...commonClient,
        ...commonCjs,
        plugins: [],
    },
    {
        ...commonServer,
        ...commonCjs,
        output: {
            ...commonCjs.output,
            format: 'es',
        },
        plugins: [dts({ emitDtsOnly: true })],
    },
    {
        ...commonClient,
        ...commonCjs,
        output: {
            ...commonCjs.output,
            format: 'es',
        },
        plugins: [dts({ emitDtsOnly: true })],
    },
]);
