// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // Точка входа приложения
  entry: './public/src/index.js',

  // Настройки выходных файлов
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true, // Очищать папку dist перед каждой сборкой
    publicPath: '/'
  },

  // Настройки модулей
  module: {
    rules: [
      {
        // Обработка JS/JSX файлов через Babel
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react'
            ]
          }
        }
      },
      {
        // Обработка CSS файлов
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        // Обработка изображений
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash][ext]'
        }
      },
      {
        // Обработка шрифтов
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash][ext]'
        }
      }
    ]
  },

  // Настройки резолва
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },

  // Плагины
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      inject: 'body',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      }
    })
  ],

  // Настройки dev-сервера
  devServer: {
    static: {
      directory: path.join(__dirname, 'public')
    },
    compress: true,
    port: 3001,
    hot: true,
    open: false,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  // Оптимизация
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        }
      }
    }
  },

  // Source maps для отладки
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',

  // Режим сборки
  mode: process.env.NODE_ENV || 'development',

  // Настройки производительности
  performance: {
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false
  }
};
