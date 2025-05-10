const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    popup: './src/popup/popup.js',
    'popup/events': './src/popup/events.js',
    'popup/i18n': './src/popup/i18n.js',
    'popup/ui': './src/popup/ui.js',
    'popup/history': './src/popup/history.js',
    'popup/logger': './src/popup/logger.js',
    'popup/constants': './src/popup/constants.js',
    'popup/theme': './src/popup/theme.js',
    'popup/helpers': './src/popup/helpers.js',
    'js/storage': './src/js/storage.js',
    'js/passwordGenerator': './src/js/passwordGenerator.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: (pathData) => {
      if (pathData.chunk.name === 'popup') return 'popup/popup.js';
      if (pathData.chunk.name.startsWith('popup/')) return 'popup/[name].js';
      if (pathData.chunk.name.startsWith('js/')) return 'js/[name].js';
      return '[name].js';
    },
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/manifest.json', to: '.' },
        { from: 'src/icons', to: 'icons' },
        { from: 'src/popup/popup.css', to: 'popup/popup.css' },
        { from: 'src/popup/locales', to: 'popup/locales' }
      ],
    }),
    new HtmlWebpackPlugin({
      filename: 'popup/popup.html',
      template: 'src/popup/popup.html',
      inject: false,
      minify: {
        collapseWhitespace: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
      },
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
}; 