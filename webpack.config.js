const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

const config = {
  entry: {
    main: ["babel-polyfill", "./js/MainPage/index.js"],
    "service-worker": ["babel-polyfill", "./service-worker.js"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js"
  },
  module: {
    rules: [
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
    new MonacoWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: "js/StandardLibraryIntellisense.ts",
          to: "js/StandardLibraryIntellisense.ts"
        },
        {
          from: "static_node_modules/opencascade.js/dist/oc.d.ts",
          to: "opencascade.d.ts"
        },
        {
          from: "node_modules/three/src/Three.d.ts",
          to: "Three.d.ts"
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
    }
  }
};

module.exports = config;
