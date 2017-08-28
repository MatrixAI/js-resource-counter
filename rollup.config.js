import fs from 'fs';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default [
  {
    entry: 'lib/Counter.js',
    format: 'umd',
    moduleName: 'Counter',
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        plugins: ['external-helpers'],
        presets: [['env', {
          modules: false,
          targets: {
            "browsers": ["last 2 versions"]
          }
        }]]
      })
    ],
    dest: 'dist/Counter-browser.js'
  },
  {
    entry: 'lib/Counter.js',
    format: 'cjs',
    plugins: [
      resolve(),
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        plugins: ['external-helpers'],
        presets: [['env', {
          modules: false,
          targets: {
            node: '6.0.0'
          }
        }]]
      })
    ],
    external: Object.keys(packageJson.dependencies),
    dest: 'dist/Counter.js'
  }
];
