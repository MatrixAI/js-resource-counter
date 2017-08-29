import fs from 'fs';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

export default [
  {
    entry: 'lib/Counter.js',
    format: 'cjs',
    external: Object.keys(packageJson.dependencies),
    plugins: [
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        presets: [['env', {
          modules: false,
          targets: {
            node: '6.0.0'
          }
        }]]
      })
    ],
    dest: 'dist/Counter.js'
  },
  {
    entry: 'lib/Counter.js',
    format: 'umd',
    moduleName: 'Counter',
    plugins: [
      babel({
        babelrc: false,
        exclude: 'node_modules/**',
        presets: [['env', {
          modules: false,
          targets: {
            "browsers": ["last 2 versions"]
          },
          debug: true
        }]]
      }),
      resolve({
        preferBuiltins: false,
        browser: true
      }),
      commonjs()
    ],
    dest: 'dist/Counter-browser.js'
  }
];
