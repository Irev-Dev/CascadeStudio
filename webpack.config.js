const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ServiceWorkerWebpackPlugin = require("serviceworker-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');

const config = {
  entry: {
    main: ["babel-polyfill", "./js/MainPage/index.js"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle[hash].js"
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1
            }
          },
          "postcss-loader"
        ]
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: "file-loader",
            options: {
              name: "[name].[ext]",
              outputPath: "fonts/"
            }
          }
        ]
      },
      {
        test: /opencascade\.wasm\.wasm$/,
        type: "javascript/auto",
        loader: "file-loader"
      }
    ]
  },
  node: {
    fs: "empty"
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "index.html")
    }),
    new ServiceWorkerWebpackPlugin({
      entry: path.join(__dirname, 'service-worker.js'),
    }),
    new MonacoWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/opencascade.js/dist/opencascade.d.ts",
          to: "opencascade.d.ts"
        },
        {
          from: "node_modules/three/src/Three.d.ts",
          to: "Three.d.ts"
        },
        {
          from: "definitions/CascadeStudioStandardLibrary.d.ts",
          to: "CascadeStudioStandardLibrary.d.ts"
        },
        {
          from: "fonts",
          to: "fonts"
        },
        {
          from: "icon",
          to: "icon"
        },
        {
          from: "textures",
          to: "textures"
        }
      ]
    })
  ],
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all"
        }
      }
    },
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_fnames: true
        }
      })
    ]
  }
};

module.exports = config;
